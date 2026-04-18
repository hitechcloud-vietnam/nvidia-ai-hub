from __future__ import annotations

from pathlib import Path

import yaml

from daemon.config import settings
from daemon.db import get_db


def _community_dir_for_slug(slug: str) -> Path:
    path = settings.community_exports_path / slug
    path.mkdir(parents=True, exist_ok=True)
    return path


def community_yaml_path_for_slug(slug: str) -> Path:
    return _community_dir_for_slug(slug) / "community.yaml"


async def export_recipe_community_yaml(slug: str) -> Path:
    async with await get_db() as db:
        rating_row = await db.execute_fetchone(
            "SELECT COUNT(*) AS rating_count, COALESCE(AVG(score), 0) AS rating_average FROM recipe_ratings WHERE slug = ?",
            (slug,),
        )
        verification_row = await db.execute_fetchone(
            "SELECT verified_count, updated_at FROM recipe_verifications WHERE slug = ?",
            (slug,),
        )
        tip_rows = await db.execute_fetchall(
            "SELECT author, content, created_at FROM recipe_tips WHERE slug = ? ORDER BY id DESC",
            (slug,),
        )

    payload = {
        "slug": slug,
        "community": {
            "rating": {
                "average": round(float(rating_row["rating_average"] or 0), 2),
                "count": int(rating_row["rating_count"] or 0),
            },
            "verified_on_my_system": {
                "count": int(verification_row["verified_count"] or 0) if verification_row else 0,
                "updated_at": verification_row["updated_at"] if verification_row else "",
            },
            "tips": [
                {
                    "author": row["author"] or "Anonymous operator",
                    "content": row["content"] or "",
                    "created_at": row["created_at"] or "",
                }
                for row in tip_rows
            ],
        },
    }

    output_path = community_yaml_path_for_slug(slug)
    output_path.write_text(yaml.safe_dump(payload, sort_keys=False, allow_unicode=True), encoding="utf-8")
    return output_path