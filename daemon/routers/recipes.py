import asyncio
from fastapi import APIRouter, HTTPException

from daemon.models.recipe import Recipe, RecipeSummary
from daemon.services.registry_service import get_recipes, get_recipe, get_recipe_dir
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


def _set_runtime_env_path(recipe: Recipe) -> None:
    recipe_dir = get_recipe_dir(recipe.slug)
    if not recipe_dir:
        return

    env_file = recipe_dir / ".env"
    env_template = recipe_dir / ".env.example"
    if env_file.is_file() or env_template.is_file():
        recipe.runtime_env_path = str(env_file)


def _to_recipe_summary(recipe: Recipe) -> RecipeSummary:
    return RecipeSummary(
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
    )


@router.get("", response_model=list[RecipeSummary])
async def list_recipes(category: str | None = None, search: str | None = None):
    recipes = list(get_recipes().values())
    installed = await get_installed_slugs()
    running = await get_running_recipe_slugs(installed)

    result = []
    for recipe in recipes:
        r = _to_recipe_summary(recipe)
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
    _set_runtime_env_path(recipe)
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
