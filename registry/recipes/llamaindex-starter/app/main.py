from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from qdrant_client import QdrantClient

from llama_index.core import Settings, SimpleDirectoryReader, StorageContext, VectorStoreIndex
from llama_index.core.indices.vector_store.base import VectorStoreIndex as VectorStoreIndexType
from llama_index.core.schema import Document
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.llms.ollama import Ollama
from llama_index.vector_stores.qdrant import QdrantVectorStore

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("llamaindex-starter")

PORT = int(os.getenv("PORT", "8000"))
DATA_DIR = Path(os.getenv("DATA_DIR", "/app/data"))
STORAGE_DIR = Path(os.getenv("STORAGE_DIR", "/app/storage"))
QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "llamaindex_starter")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11435")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3.5:4b")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
AUTO_INGEST = os.getenv("AUTO_INGEST", "true").lower() == "true"
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1024"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "100"))
SIMILARITY_TOP_K = int(os.getenv("SIMILARITY_TOP_K", "5"))

app = FastAPI(title="LlamaIndex Starter", version="1.0.0")


class QueryRequest(BaseModel):
    query: str


class QueryResponse(BaseModel):
    answer: str
    sources: list[str]


index: VectorStoreIndexType | None = None


def _ensure_directories() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)



def _build_index() -> VectorStoreIndexType:
    _ensure_directories()

    Settings.llm = Ollama(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL, request_timeout=120.0)
    Settings.embed_model = OllamaEmbedding(model_name=OLLAMA_EMBED_MODEL, base_url=OLLAMA_BASE_URL)
    Settings.chunk_size = CHUNK_SIZE
    Settings.chunk_overlap = CHUNK_OVERLAP

    client = QdrantClient(url=QDRANT_URL)
    vector_store = QdrantVectorStore(client=client, collection_name=QDRANT_COLLECTION)
    storage_context = StorageContext.from_defaults(vector_store=vector_store, persist_dir=str(STORAGE_DIR))

    documents: list[Document] = []
    if DATA_DIR.exists():
        loaded = SimpleDirectoryReader(input_dir=str(DATA_DIR), recursive=True).load_data()
        documents.extend(loaded)

    if not documents:
        documents.append(
            Document(
                text=(
                    "This is the default LlamaIndex starter document. Add files under /app/data "
                    "or registry/recipes/llamaindex-starter/data/documents and restart or call /api/reindex."
                ),
                metadata={"source": "starter-note"},
            )
        )

    logger.info("Building vector index with %s documents", len(documents))
    built_index = VectorStoreIndex.from_documents(documents, storage_context=storage_context)
    built_index.storage_context.persist(persist_dir=str(STORAGE_DIR))
    return built_index



def _get_or_create_index(force_rebuild: bool = False) -> VectorStoreIndexType:
    global index
    if index is None or force_rebuild:
        index = _build_index()
    return index


@app.on_event("startup")
def startup_event() -> None:
    if AUTO_INGEST:
        _get_or_create_index(force_rebuild=True)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "ollama_base_url": OLLAMA_BASE_URL,
        "ollama_model": OLLAMA_MODEL,
        "ollama_embed_model": OLLAMA_EMBED_MODEL,
        "qdrant_url": QDRANT_URL,
        "collection": QDRANT_COLLECTION,
        "documents_dir": str(DATA_DIR),
    }


@app.post("/api/reindex")
def reindex() -> dict[str, str]:
    _get_or_create_index(force_rebuild=True)
    return {"status": "reindexed"}


@app.post("/api/query", response_model=QueryResponse)
def query_documents(request: QueryRequest) -> QueryResponse:
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty")

    query_engine = _get_or_create_index().as_query_engine(similarity_top_k=SIMILARITY_TOP_K)
    response = query_engine.query(request.query)

    sources: list[str] = []
    for node in getattr(response, "source_nodes", []) or []:
        metadata = getattr(node, "metadata", {}) or {}
        source = metadata.get("file_name") or metadata.get("source") or "unknown"
        if source not in sources:
            sources.append(source)

    return QueryResponse(answer=str(response), sources=sources)


@app.get("/", response_class=HTMLResponse)
def root() -> str:
    return f"""
<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>LlamaIndex Starter</title>
    <style>
      :root {{ color-scheme: dark; }}
      body {{ font-family: Arial, sans-serif; margin: 0; background: #0b1020; color: #e5e7eb; }}
      main {{ max-width: 900px; margin: 0 auto; padding: 32px 20px 60px; }}
      h1 {{ margin-bottom: 8px; }}
      .card {{ background: #121933; border: 1px solid #24304d; border-radius: 16px; padding: 20px; margin-top: 20px; }}
      textarea {{ width: 100%; min-height: 120px; border-radius: 12px; border: 1px solid #334155; background: #0f172a; color: #e5e7eb; padding: 12px; }}
      button {{ margin-top: 12px; background: #4f46e5; color: white; border: 0; border-radius: 10px; padding: 12px 18px; cursor: pointer; }}
      pre {{ white-space: pre-wrap; background: #020617; border-radius: 12px; padding: 16px; overflow-x: auto; }}
      .muted {{ color: #94a3b8; font-size: 14px; }}
      ul {{ line-height: 1.7; }}
    </style>
  </head>
  <body>
    <main>
      <h1>LlamaIndex Starter</h1>
      <p class=\"muted\">Local LlamaIndex RAG starter with Qdrant and Ollama.</p>

      <div class=\"card\">
        <h2>Try a query</h2>
        <textarea id=\"query\" placeholder=\"Ask about your indexed documents...\"></textarea>
        <br />
        <button onclick=\"runQuery()\">Send query</button>
        <button onclick=\"reindexDocs()\">Reindex documents</button>
      </div>

      <div class=\"card\">
        <h2>Response</h2>
        <pre id=\"answer\">No query yet.</pre>
        <div id=\"sources\" class=\"muted\"></div>
      </div>

      <div class=\"card\">
        <h2>Workflow</h2>
        <ul>
          <li>Place files in <code>registry/recipes/llamaindex-starter/data/documents</code>.</li>
          <li>Ensure the shared Ollama runtime has <code>{OLLAMA_MODEL}</code> and <code>{OLLAMA_EMBED_MODEL}</code>.</li>
          <li>Use <code>/api/reindex</code> after changing documents if auto-ingest is disabled.</li>
        </ul>
      </div>
    </main>
    <script>
      async function runQuery() {{
        const query = document.getElementById('query').value;
        const response = await fetch('/api/query', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ query }})
        }});
        const data = await response.json();
        document.getElementById('answer').textContent = data.answer || data.detail || 'No response';
        document.getElementById('sources').textContent = data.sources?.length ? 'Sources: ' + data.sources.join(', ') : '';
      }}

      async function reindexDocs() {{
        const response = await fetch('/api/reindex', {{ method: 'POST' }});
        const data = await response.json();
        document.getElementById('answer').textContent = JSON.stringify(data, null, 2);
        document.getElementById('sources').textContent = 'Documents reindexed.';
      }}
    </script>
  </body>
</html>
"""
