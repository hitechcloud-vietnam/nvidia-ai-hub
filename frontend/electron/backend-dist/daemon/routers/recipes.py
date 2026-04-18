import asyncio
from urllib.parse import quote

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from daemon.db import get_db
from daemon.models.recipe import Recipe, RecipeCommunitySummary, RecipeCommunityTip, RecipeSummary
from daemon.services.registry_service import get_recipes, get_recipe, get_recipe_dir, get_registry_delta, sync_registry
from daemon.services.community_service import community_yaml_path_for_slug, export_recipe_community_yaml
from daemon.services.sync_export import build_platform_exports
from daemon.services.docker_service import (
    get_installed_slugs,
    get_running_recipe_slugs,
    is_recipe_running,
    is_ready,
    has_recipe_leftovers,
    start_health_check,
    get_pending,
)

router = APIRouter(prefix="/api/recipes", tags=["recipes"])

SUBMIT_RECIPE_URL = "https://github.com/hitechcloud-vietnam/nvidia-ai-hub/compare/main...main?expand=1"


class RecipeVerificationBody(BaseModel):
    increment: int = Field(default=1, ge=1, le=1)


class RecipeRatingBody(BaseModel):
    score: int = Field(ge=1, le=5)


class RecipeTipBody(BaseModel):
    author: str = Field(default="Anonymous operator", max_length=80)
    content: str = Field(min_length=4, max_length=1200)


def _build_submit_recipe_url(recipe: Recipe | RecipeSummary | None = None) -> str:
    if not recipe:
        return SUBMIT_RECIPE_URL

    upstream = getattr(recipe, "upstream", "") or "n/a"
    title = quote(f"recipe: {recipe.slug}")
    body = quote(
        "## Recipe submission\n"
        f"- Name: {recipe.name}\n"
        f"- Slug: {recipe.slug}\n"
        f"- Upstream: {upstream}\n"
        "- Summary: \n\n"
        "## Validation\n"
        "- Tested on: \n"
        "- GPU / host: \n"
        "- Notes: \n"
    )
    return f"{SUBMIT_RECIPE_URL}&title={title}&body={body}"


async def _load_recipe_community(slug: str, recipe: Recipe | RecipeSummary | None = None) -> RecipeCommunitySummary:
    db = await get_db()
    try:
        rating_row = await db.execute_fetchone(
            "SELECT COUNT(*) AS rating_count, COALESCE(AVG(score), 0) AS rating_average FROM recipe_ratings WHERE slug = ?",
            (slug,),
        )
        verification_row = await db.execute_fetchone(
            "SELECT verified_count FROM recipe_verifications WHERE slug = ?",
            (slug,),
        )
        tip_rows = await db.execute_fetchall(
            "SELECT id, author, content, created_at FROM recipe_tips WHERE slug = ? ORDER BY id DESC LIMIT 8",
            (slug,),
        )
    finally:
        await db.close()

    return RecipeCommunitySummary(
        rating_average=round(float(rating_row["rating_average"] or 0), 1),
        rating_count=int(rating_row["rating_count"] or 0),
        verified_count=int(verification_row["verified_count"] or 0) if verification_row else 0,
        tips_count=len(tip_rows),
        tips=[
            RecipeCommunityTip(
                id=int(row["id"]),
                author=row["author"] or "Anonymous operator",
                content=row["content"] or "",
                created_at=row["created_at"] or "",
            )
            for row in tip_rows
        ],
        submit_recipe_url=_build_submit_recipe_url(recipe),
    )


async def _apply_recipe_community(recipe: Recipe | RecipeSummary) -> None:
    recipe.community = await _load_recipe_community(recipe.slug, recipe)


@router.get("/registry/status")
async def registry_status():
    return get_registry_delta()


@router.post("/registry/sync")
async def registry_sync():
    return sync_registry()


def _set_runtime_env_path(recipe: Recipe) -> None:
    recipe_dir = get_recipe_dir(recipe.slug)
    if not recipe_dir:
        return

    env_file = recipe_dir / ".env"
    env_template = recipe_dir / ".env.example"
    if env_file.is_file() or env_template.is_file():
        recipe.runtime_env_path = str(env_file)


def _to_recipe_summary(recipe: Recipe) -> RecipeSummary:
    summary = RecipeSummary(
        name=recipe.name,
        slug=recipe.slug,
        version=recipe.version,
        description=recipe.description,
        author=recipe.author,
        category=recipe.category,
        categories=list(recipe.categories),
        tags=list(recipe.tags),
        icon=recipe.icon,
        logo=recipe.logo,
        requirements=recipe.requirements,
        ui=recipe.ui,
        docker=recipe.docker,
        source=recipe.source,
        status=recipe.status,
        requires_hf_token=recipe.requires_hf_token,
        community=recipe.community,
    )
    _set_runtime_env_path(summary)
    return summary


def _apply_registry_delta(recipe: Recipe | RecipeSummary, registry_delta: dict) -> None:
    updates = registry_delta.get("recipe_deltas", {}).get(recipe.slug, [])
    recipe.registry_updates = updates
    recipe.registry_update_count = len(updates)
    recipe.registry_changed = recipe.registry_update_count > 0


@router.get("", response_model=list[RecipeSummary])
async def list_recipes(category: str | None = None, search: str | None = None):
    recipes = list(get_recipes().values())
    registry_delta = get_registry_delta()
    installed = await get_installed_slugs()
    running = await get_running_recipe_slugs(installed)

    result = []
    for recipe in recipes:
        r = _to_recipe_summary(recipe)
        _apply_registry_delta(r, registry_delta)
        await _apply_recipe_community(r)
        r.installed = r.slug in installed
        pending = get_pending(r.slug)
        if r.installed:
            container_running = r.slug in running
            r.ready = is_ready(r.slug) if container_running else False
            # If an action is in-flight, keep showing the right transition state
            if pending == "launching":
                r.starting = True
                r.running = False
            elif pending == "stopping":
                r.running = False
                r.starting = False
            else:
                r.starting = container_running and not r.ready
                r.running = container_running and r.ready
            if r.starting or (container_running and not r.ready):
                asyncio.create_task(start_health_check(r.slug))
        else:
            r.running = False
            r.ready = False
            # If launching/installing, still show starting
            r.starting = pending in ("launching", "installing")
        recipe_categories = r.categories if r.categories else [r.category]
        if category and category != "all" and category not in recipe_categories:
            continue
        if search:
            q = search.lower()
            if q not in r.name.lower() and not any(q in t for t in r.tags):
                continue
        result.append(r)
    return result


@router.get("/{slug}", response_model=Recipe)
async def get_recipe_detail(slug: str):
    base_recipe = get_recipe(slug)
    if not base_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    recipe = base_recipe.model_copy(deep=True)
    _apply_registry_delta(recipe, get_registry_delta())
    _set_runtime_env_path(recipe)
    await _apply_recipe_community(recipe)
    installed = await get_installed_slugs()
    recipe.installed = slug in installed
    pending = get_pending(slug)
    if recipe.installed:
        container_running = await is_recipe_running(slug)
        recipe.ready = is_ready(slug) if container_running else False
        if pending == "launching":
            recipe.starting = True
            recipe.running = False
        elif pending == "stopping":
            recipe.running = False
            recipe.starting = False
        else:
            recipe.starting = container_running and not recipe.ready
            recipe.running = container_running and recipe.ready
        if recipe.starting or (container_running and not recipe.ready):
            asyncio.create_task(start_health_check(slug))
    else:
        recipe.running = False
        recipe.ready = False
        recipe.starting = pending in ("launching", "installing")
        if not recipe.starting:
            recipe.has_leftovers = await has_recipe_leftovers(slug)
    return recipe


@router.get("/{slug}/exports")
async def get_recipe_exports(slug: str, host: str = "localhost"):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return build_platform_exports(recipe, host)


@router.get("/{slug}/community", response_model=RecipeCommunitySummary)
async def get_recipe_community(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return await _load_recipe_community(slug, recipe)


@router.post("/{slug}/community/verify", response_model=RecipeCommunitySummary)
async def verify_recipe(slug: str, body: RecipeVerificationBody):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    db = await get_db()
    try:
        await db.execute(
            """
            INSERT INTO recipe_verifications (slug, verified_count, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(slug) DO UPDATE SET
                verified_count = verified_count + excluded.verified_count,
                updated_at = datetime('now')
            """,
            (slug, body.increment),
        )
        await db.commit()
    finally:
        await db.close()

    await export_recipe_community_yaml(slug)
    return await _load_recipe_community(slug, recipe)


@router.post("/{slug}/community/rate", response_model=RecipeCommunitySummary)
async def rate_recipe(slug: str, body: RecipeRatingBody):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO recipe_ratings (slug, score) VALUES (?, ?)",
            (slug, body.score),
        )
        await db.commit()
    finally:
        await db.close()

    await export_recipe_community_yaml(slug)
    return await _load_recipe_community(slug, recipe)


@router.post("/{slug}/community/tips", response_model=RecipeCommunitySummary)
async def add_recipe_tip(slug: str, body: RecipeTipBody):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    author = (body.author or "Anonymous operator").strip() or "Anonymous operator"
    content = body.content.strip()
    if len(content) < 4:
        raise HTTPException(status_code=400, detail="Tip content is too short")

    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO recipe_tips (slug, author, content) VALUES (?, ?, ?)",
            (slug, author, content),
        )
        await db.commit()
    finally:
        await db.close()

    await export_recipe_community_yaml(slug)
    return await _load_recipe_community(slug, recipe)


@router.post("/{slug}/community/export")
async def export_recipe_community(slug: str):
    recipe = get_recipe(slug)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    output_path = await export_recipe_community_yaml(slug)
    return {
        "status": "exported",
        "path": str(output_path),
        "filename": community_yaml_path_for_slug(slug).name,
    }
