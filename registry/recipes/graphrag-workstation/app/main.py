from __future__ import annotations

import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import streamlit as st
import yaml

PROJECTS_ROOT = Path(os.getenv("PROJECTS_ROOT", "/workspace/projects")).resolve()
DEFAULT_DATASET_NAME = os.getenv("DEFAULT_DATASET_NAME", "demo-graph-project")
DEFAULT_RESPONSE_TYPE = os.getenv("DEFAULT_RESPONSE_TYPE", "Multiple Paragraphs")
DEFAULT_MODEL_PROVIDER = os.getenv("GRAPHRAG_MODEL_PROVIDER", "openai")
DEFAULT_COMPLETION_MODEL = os.getenv("GRAPHRAG_COMPLETION_MODEL", "gpt-4.1-mini")
DEFAULT_EMBEDDING_MODEL = os.getenv("GRAPHRAG_EMBEDDING_MODEL", "text-embedding-3-small")
DEFAULT_API_KEY = os.getenv("GRAPHRAG_API_KEY", "")
DEFAULT_API_BASE = os.getenv("GRAPHRAG_API_BASE", "")
DEFAULT_API_VERSION = os.getenv("GRAPHRAG_API_VERSION", "")
DEFAULT_AZURE_CHAT_DEPLOYMENT = os.getenv("GRAPHRAG_AZURE_CHAT_DEPLOYMENT", "")
DEFAULT_AZURE_EMBEDDING_DEPLOYMENT = os.getenv("GRAPHRAG_AZURE_EMBEDDING_DEPLOYMENT", "")

SEARCH_METHODS = ["global", "local", "drift", "basic"]


st.set_page_config(page_title="GraphRAG Workstation", layout="wide")


def ensure_projects_root() -> None:
    PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)


def slugify(value: str) -> str:
    cleaned = "".join(char.lower() if char.isalnum() else "-" for char in value.strip())
    normalized = "-".join(part for part in cleaned.split("-") if part)
    return normalized or DEFAULT_DATASET_NAME


def dataset_path(slug: str) -> Path:
    return PROJECTS_ROOT / slug


def metadata_path(path: Path) -> Path:
    return path / "metadata.json"


def dataset_metadata(path: Path) -> dict[str, Any]:
    metadata_file = metadata_path(path)
    if metadata_file.exists():
        try:
            return json.loads(metadata_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {
        "key": path.name,
        "path": path.name,
        "name": path.name.replace("-", " ").title(),
        "description": "GraphRAG dataset workspace.",
        "community_level": 2,
        "created_at": "",
    }


def save_metadata(path: Path, metadata: dict[str, Any]) -> None:
    metadata_path(path).write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def list_datasets() -> list[dict[str, Any]]:
    ensure_projects_root()
    datasets: list[dict[str, Any]] = []
    for child in sorted(PROJECTS_ROOT.iterdir()):
        if not child.is_dir():
            continue
        metadata = dataset_metadata(child)
        datasets.append(
            {
                "slug": child.name,
                "path": child,
                "metadata": metadata,
                "has_settings": (child / "settings.yaml").exists(),
                "has_input": (child / "input").exists(),
                "has_output": (child / "output").exists(),
                "has_prompts": (child / "prompts").exists(),
            }
        )
    return datasets


def write_listing_json() -> Path:
    listing = []
    for item in list_datasets():
        metadata = item["metadata"]
        listing.append(
            {
                "key": metadata.get("key", item["slug"]),
                "path": metadata.get("path", item["slug"]),
                "name": metadata.get("name", item["slug"]),
                "description": metadata.get("description", "GraphRAG dataset workspace."),
                "community_level": int(metadata.get("community_level", 2)),
            }
        )
    listing_path = PROJECTS_ROOT / "listing.json"
    listing_path.write_text(json.dumps(listing, indent=2), encoding="utf-8")
    return listing_path


def run_command(command: list[str], cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        capture_output=True,
        text=True,
        check=False,
    )


def update_model_config(model_config: dict[str, Any], *, provider: str, model: str, api_base: str, api_version: str, api_key_ref: str, azure_deployment: str) -> dict[str, Any]:
    updated = dict(model_config)
    updated["type"] = updated.get("type", "litellm")
    updated["model_provider"] = provider
    updated["model"] = model
    updated["auth_method"] = "api_key"
    updated["api_key"] = api_key_ref
    if api_base:
        updated["api_base"] = api_base
    else:
        updated.pop("api_base", None)
    if api_version:
        updated["api_version"] = api_version
    else:
        updated.pop("api_version", None)
    if provider == "azure" and azure_deployment:
        updated["azure_deployment_name"] = azure_deployment
    else:
        updated.pop("azure_deployment_name", None)
    return updated


def sync_settings(dataset_dir: Path, *, provider: str, completion_model: str, embedding_model: str, api_base: str, api_version: str, azure_chat_deployment: str, azure_embedding_deployment: str) -> None:
    settings_file = dataset_dir / "settings.yaml"
    if not settings_file.exists():
        raise FileNotFoundError(f"Missing settings.yaml in {dataset_dir}")

    settings = yaml.safe_load(settings_file.read_text(encoding="utf-8")) or {}
    completion_models = settings.setdefault("completion_models", {})
    embedding_models = settings.setdefault("embedding_models", {})

    completion_key = next(iter(completion_models.keys()), "default_completion_model")
    embedding_key = next(iter(embedding_models.keys()), "default_embedding_model")

    completion_models[completion_key] = update_model_config(
        completion_models.get(completion_key, {}),
        provider=provider,
        model=completion_model,
        api_base=api_base,
        api_version=api_version,
        api_key_ref="${GRAPHRAG_API_KEY}",
        azure_deployment=azure_chat_deployment,
    )
    embedding_models[embedding_key] = update_model_config(
        embedding_models.get(embedding_key, {}),
        provider=provider,
        model=embedding_model,
        api_base=api_base,
        api_version=api_version,
        api_key_ref="${GRAPHRAG_API_KEY}",
        azure_deployment=azure_embedding_deployment,
    )

    settings.setdefault("input", {})["type"] = settings.get("input", {}).get("type", "file")
    settings["input"]["file_type"] = settings["input"].get("file_type", "text")
    settings["input"]["base_dir"] = "input"

    settings.setdefault("output", {})["type"] = "file"
    settings["output"]["base_dir"] = "output"

    settings.setdefault("vector_store", {})["type"] = settings.get("vector_store", {}).get("type", "lancedb")
    settings["vector_store"]["db_uri"] = "output/lancedb"

    settings.setdefault("snapshots", {})["graphml"] = True

    settings_file.write_text(yaml.safe_dump(settings, sort_keys=False), encoding="utf-8")


def write_env_file(dataset_dir: Path, *, api_key: str, api_base: str, api_version: str) -> None:
    lines = [
        f"GRAPHRAG_API_KEY={api_key}",
        f"GRAPHRAG_API_BASE={api_base}",
        f"GRAPHRAG_API_VERSION={api_version}",
    ]
    (dataset_dir / ".env").write_text("\n".join(lines) + "\n", encoding="utf-8")


def initialize_dataset(slug: str, name: str, description: str, community_level: int, sample_text: str, *, provider: str, completion_model: str, embedding_model: str, api_key: str, api_base: str, api_version: str, azure_chat_deployment: str, azure_embedding_deployment: str) -> tuple[bool, str]:
    target = dataset_path(slug)
    target.mkdir(parents=True, exist_ok=True)
    (target / "input").mkdir(exist_ok=True)

    sample_file = target / "input" / "sample.txt"
    if sample_text.strip() and not sample_file.exists():
        sample_file.write_text(sample_text.strip() + "\n", encoding="utf-8")

    result = run_command(
        [
            "graphrag",
            "init",
            "--root",
            str(target),
            "--force",
            "--model",
            completion_model,
            "--embedding",
            embedding_model,
        ]
    )
    if result.returncode != 0:
        return False, (result.stdout + "\n" + result.stderr).strip()

    sync_settings(
        target,
        provider=provider,
        completion_model=completion_model,
        embedding_model=embedding_model,
        api_base=api_base,
        api_version=api_version,
        azure_chat_deployment=azure_chat_deployment,
        azure_embedding_deployment=azure_embedding_deployment,
    )
    write_env_file(target, api_key=api_key, api_base=api_base, api_version=api_version)
    save_metadata(
        target,
        {
            "key": slug,
            "path": slug,
            "name": name,
            "description": description,
            "community_level": community_level,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    write_listing_json()
    return True, (result.stdout + "\n" + result.stderr).strip()


def run_index(slug: str) -> subprocess.CompletedProcess[str]:
    return run_command(["graphrag", "index", "--root", str(dataset_path(slug))])


def run_query(slug: str, method: str, query: str, response_type: str, community_level: int) -> subprocess.CompletedProcess[str]:
    command = [
        "graphrag",
        "query",
        query,
        "--root",
        str(dataset_path(slug)),
        "--method",
        method,
        "--response-type",
        response_type,
    ]
    if method in {"global", "local", "drift"}:
        command.extend(["--community-level", str(community_level)])
    return run_command(command)


def describe_dataset(item: dict[str, Any]) -> str:
    flags = []
    if item["has_settings"]:
        flags.append("settings")
    if item["has_prompts"]:
        flags.append("prompts")
    if item["has_input"]:
        flags.append("input")
    if item["has_output"]:
        flags.append("output")
    return ", ".join(flags) if flags else "empty"


def main() -> None:
    ensure_projects_root()
    st.title("GraphRAG Workstation")
    st.caption("Practical GraphRAG dataset bootstrap, indexing, and query comparison workbench.")

    with st.sidebar:
        st.subheader("Runtime defaults")
        st.code(
            "\n".join(
                [
                    f"PROJECTS_ROOT={PROJECTS_ROOT}",
                    f"MODEL_PROVIDER={DEFAULT_MODEL_PROVIDER}",
                    f"COMPLETION_MODEL={DEFAULT_COMPLETION_MODEL}",
                    f"EMBEDDING_MODEL={DEFAULT_EMBEDDING_MODEL}",
                ]
            )
        )
        if st.button("Refresh listing.json"):
            listing_path = write_listing_json()
            st.success(f"Updated {listing_path.name}")

    datasets = list_datasets()
    dataset_names = [item["slug"] for item in datasets]

    create_col, browse_col = st.columns([0.42, 0.58])

    with create_col:
        st.subheader("Create or refresh a dataset")
        with st.form("create_dataset_form"):
            dataset_name_value = st.text_input("Dataset name", value="Demo Graph Project")
            dataset_slug_value = st.text_input("Dataset slug", value=DEFAULT_DATASET_NAME)
            dataset_description = st.text_area(
                "Description",
                value="Starter GraphRAG workspace for local indexing and query comparisons.",
            )
            community_level = st.number_input("Community level", min_value=1, max_value=10, value=2)
            sample_text = st.text_area(
                "Starter sample text",
                value="GraphRAG helps compare basic, local, global, and drift search over an indexed corpus.",
                height=120,
            )
            provider = st.selectbox("Model provider", options=["openai", "azure", "anthropic", "gemini"], index=0 if DEFAULT_MODEL_PROVIDER not in ["openai", "azure", "anthropic", "gemini"] else ["openai", "azure", "anthropic", "gemini"].index(DEFAULT_MODEL_PROVIDER))
            completion_model = st.text_input("Completion model", value=DEFAULT_COMPLETION_MODEL)
            embedding_model = st.text_input("Embedding model", value=DEFAULT_EMBEDDING_MODEL)
            api_key = st.text_input("API key", value=DEFAULT_API_KEY, type="password")
            api_base = st.text_input("API base", value=DEFAULT_API_BASE)
            api_version = st.text_input("API version", value=DEFAULT_API_VERSION)
            azure_chat_deployment = st.text_input("Azure chat deployment", value=DEFAULT_AZURE_CHAT_DEPLOYMENT)
            azure_embedding_deployment = st.text_input("Azure embedding deployment", value=DEFAULT_AZURE_EMBEDDING_DEPLOYMENT)
            submitted = st.form_submit_button("Initialize dataset")

        if submitted:
            slug = slugify(dataset_slug_value)
            with st.spinner("Initializing GraphRAG dataset..."):
                ok, output = initialize_dataset(
                    slug=slug,
                    name=dataset_name_value.strip() or slug,
                    description=dataset_description.strip() or "GraphRAG dataset workspace.",
                    community_level=int(community_level),
                    sample_text=sample_text,
                    provider=provider,
                    completion_model=completion_model,
                    embedding_model=embedding_model,
                    api_key=api_key,
                    api_base=api_base,
                    api_version=api_version,
                    azure_chat_deployment=azure_chat_deployment,
                    azure_embedding_deployment=azure_embedding_deployment,
                )
            if ok:
                st.success(f"Dataset `{slug}` initialized.")
            else:
                st.error(f"Failed to initialize `{slug}`.")
            if output:
                st.code(output)

    with browse_col:
        st.subheader("Dataset inventory")
        if not datasets:
            st.info("No datasets yet. Create one from the form.")
        else:
            for item in datasets:
                metadata = item["metadata"]
                with st.expander(f"{metadata.get('name', item['slug'])} · `{item['slug']}`", expanded=item["slug"] == DEFAULT_DATASET_NAME):
                    st.write(metadata.get("description", "GraphRAG dataset workspace."))
                    st.caption(f"Workspace: {item['path']}")
                    st.write(f"Artifacts: {describe_dataset(item)}")
                    st.json(metadata)

    st.divider()

    st.subheader("Index and query")
    if dataset_names:
        selected_slug = st.selectbox("Dataset", options=dataset_names)
        selected_item = next(item for item in datasets if item["slug"] == selected_slug)
        selected_meta = selected_item["metadata"]

        action_col, query_col = st.columns([0.35, 0.65])

        with action_col:
            st.markdown("#### Indexing")
            st.write("Run GraphRAG indexing against the selected dataset root.")
            if st.button("Run `graphrag index`", use_container_width=True):
                with st.spinner("Running GraphRAG index..."):
                    result = run_index(selected_slug)
                if result.returncode == 0:
                    st.success("Index completed.")
                    write_listing_json()
                else:
                    st.error("Index failed.")
                st.code((result.stdout + "\n" + result.stderr).strip() or "No output")

            st.markdown("#### Compatibility listing")
            listing_path = PROJECTS_ROOT / "listing.json"
            st.write(f"Unified-search style listing file: `{listing_path}`")
            if listing_path.exists():
                st.code(listing_path.read_text(encoding="utf-8"))

        with query_col:
            st.markdown("#### Query comparison")
            query_text = st.text_area(
                "Question",
                value="What are the key themes in this dataset?",
                height=100,
            )
            response_type = st.text_input("Response type", value=DEFAULT_RESPONSE_TYPE)
            methods = st.multiselect("Search methods", options=SEARCH_METHODS, default=SEARCH_METHODS)
            run_queries = st.button("Run selected queries", use_container_width=True)
            if run_queries:
                if not methods:
                    st.warning("Select at least one search method.")
                else:
                    for method in methods:
                        with st.spinner(f"Running {method} search..."):
                            result = run_query(
                                selected_slug,
                                method,
                                query_text,
                                response_type,
                                int(selected_meta.get("community_level", 2)),
                            )
                        if result.returncode == 0:
                            st.success(f"{method} search completed.")
                        else:
                            st.error(f"{method} search failed.")
                        st.markdown(f"##### {method.title()} output")
                        st.code((result.stdout + "\n" + result.stderr).strip() or "No output")
    else:
        st.info("Create a dataset first to enable indexing and queries.")

    st.divider()
    st.subheader("Expected dataset layout")
    st.code(
        """projects/
  listing.json
  <dataset>/
    input/
    settings.yaml
    .env
    prompts/
    output/
    metadata.json
"""
    )
    st.write(
        "GraphRAG query modes available here are `basic`, `local`, `global`, and `drift`. "
        "This workstation is intentionally narrow: it helps bootstrap datasets, persist project folders, and run upstream CLI workflows inside one local Streamlit surface."
    )


if __name__ == "__main__":
    main()
