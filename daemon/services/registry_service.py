from pathlib import Path
import yaml
from daemon.config import settings
from daemon.models.recipe import Recipe


_recipes: dict[str, Recipe] = {}


def load_recipes() -> dict[str, Recipe]:
    global _recipes
    _recipes = {}
    registry = settings.registry_path
    if not registry.is_dir():
        return _recipes
    for recipe_dir in sorted(registry.iterdir()):
        yaml_path = recipe_dir / "recipe.yaml"
        if not yaml_path.is_file():
            continue
        try:
            with open(yaml_path) as f:
                data = yaml.safe_load(f)
            recipe = Recipe(**data)
            _recipes[recipe.slug] = recipe
        except Exception as e:
            print(f"[registry] Failed to load {yaml_path}: {e}")
    print(f"[registry] Loaded {len(_recipes)} recipes")
    return _recipes


def get_recipes() -> dict[str, Recipe]:
    return _recipes


def get_recipe(slug: str) -> Recipe | None:
    return _recipes.get(slug)


def get_recipe_dir(slug: str) -> Path | None:
    d = settings.registry_path / slug
    return d if d.is_dir() else None
