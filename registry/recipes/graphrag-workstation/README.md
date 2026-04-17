# GraphRAG Workstation

Practical GraphRAG workstation for DGX Spark using a local Streamlit workbench and the official `graphrag` Python package.

## What it provides

- Streamlit GraphRAG workstation on port `3086`
- Persistent project workspace under `./workspace/projects`
- One-click dataset bootstrap flow backed by `graphrag init`
- Indexed corpus workflows backed by `graphrag index`
- Query comparison workflows for `basic`, `local`, `global`, and `drift` search modes
- Auto-generated `listing.json` compatible with the official `unified-search-app` dataset layout

## Default access

- Workstation UI: `http://localhost:3086`

## Included services

- custom local Python 3.11 image built in this repository
- official upstream `graphrag` Python package installed at container build time
- Streamlit-based workbench for managing GraphRAG project folders

## Scope of this workstation

This recipe is intentionally practical rather than trying to mirror the full upstream repository layout.

Included here:

- dataset folder creation inside `registry/recipes/graphrag-workstation/workspace/projects`
- starter `input/` content creation for first-run testing
- `settings.yaml`, `.env`, and `prompts/` generation through the upstream CLI
- config synchronization for LiteLLM-style provider settings such as `model_provider`, `model`, `api_base`, and `api_version`
- GraphRAG indexing and query execution from a single local UI
- generation of a top-level `listing.json` file that follows the upstream workstation dataset convention

Not included here:

- the full upstream `unified-search-app` source tree
- Azure Blob dataset hosting
- enterprise auth, RBAC, or external secret stores
- automatic GPU acceleration for GraphRAG workloads
- opinionated prompt tuning automation beyond the upstream CLI itself

## Required configuration

Before first indexing or querying:

1. Open the workstation UI.
2. Create a dataset or refresh an existing dataset workspace.
3. Provide valid model credentials and endpoint settings for your chosen LiteLLM-compatible provider.
4. Add `.txt` or `.csv` source files under the dataset `input/` directory.
5. Run indexing before attempting `local`, `global`, `drift`, or `basic` queries.

## Dataset layout

Each dataset workspace is stored under:

- `registry/recipes/graphrag-workstation/workspace/projects/<dataset>/input`
- `registry/recipes/graphrag-workstation/workspace/projects/<dataset>/settings.yaml`
- `registry/recipes/graphrag-workstation/workspace/projects/<dataset>/.env`
- `registry/recipes/graphrag-workstation/workspace/projects/<dataset>/prompts`
- `registry/recipes/graphrag-workstation/workspace/projects/<dataset>/output`
- `registry/recipes/graphrag-workstation/workspace/projects/<dataset>/metadata.json`

The recipe also maintains:

- `registry/recipes/graphrag-workstation/workspace/projects/listing.json`

That file follows the same high-level shape documented by the official GraphRAG unified search sample.

## Model compatibility notes

GraphRAG v3 uses LiteLLM-style configuration. This recipe exposes the most common fields through `.env` and the Streamlit bootstrap form:

- `GRAPHRAG_MODEL_PROVIDER`
- `GRAPHRAG_COMPLETION_MODEL`
- `GRAPHRAG_EMBEDDING_MODEL`
- `GRAPHRAG_API_KEY`
- `GRAPHRAG_API_BASE`
- `GRAPHRAG_API_VERSION`
- optional Azure deployment names for chat and embeddings

The generated dataset `settings.yaml` is normalized to:

- use `input.base_dir: input`
- use `output.base_dir: output`
- use local LanceDB at `output/lancedb`
- enable `snapshots.graphml: true` for downstream graph inspection

## Persistent data

This recipe stores state under:

- `registry/recipes/graphrag-workstation/workspace/projects`

## Validation scope

Validated in this repository by:

- creating recipe metadata, environment templates, Docker build assets, compose definition, workstation app, workspace scaffold, and recipe documentation
- checking editor diagnostics for the new GraphRAG workstation files
- confirming Python syntax for the local Streamlit workstation app

Not validated here:

- live Docker build or container startup, because Docker is unavailable in this Windows workspace
- live `graphrag init`, `graphrag index`, or `graphrag query` execution against real provider credentials
- retrieval quality, indexing cost, or provider-specific structured-output compatibility

## License notes

- Upstream project: `microsoft/graphrag`
- Upstream project license: MIT
- Review dependency and provider terms before production redistribution or commercial rollout

## Risk notes

- GraphRAG upstream APIs and config defaults evolve quickly; future releases may require updates to the dataset synchronization logic.
- Query quality and indexing success depend on the selected provider supporting GraphRAG prompt and structured-output expectations.
- Large corpora can consume significant time, tokens, and disk space during indexing.
- This recipe is intended as a workstation starter for roadmap coverage and experimentation, not a hardened production deployment.
