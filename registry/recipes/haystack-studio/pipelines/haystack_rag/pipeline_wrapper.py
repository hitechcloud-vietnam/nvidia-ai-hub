from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from pathlib import Path

from haystack import Document, Pipeline
from haystack.components.builders import PromptBuilder
from haystack.components.converters import TextFileToDocument
from haystack.components.preprocessors import DocumentCleaner, DocumentSplitter
from haystack.components.writers import DocumentWriter
from haystack.dataclasses import ChatMessage
from haystack.document_stores.types import DuplicatePolicy
from haystack_integrations.components.embedders.ollama import OllamaDocumentEmbedder
from haystack_integrations.components.embedders.ollama import OllamaTextEmbedder
from haystack_integrations.components.generators.ollama import OllamaGenerator
from haystack_integrations.components.retrievers.qdrant import QdrantEmbeddingRetriever
from haystack_integrations.document_stores.qdrant import QdrantDocumentStore

from hayhooks import BasePipelineWrapper, get_last_user_message, log

DOCUMENTS_DIR = Path("/workspace/documents")
QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")
QDRANT_INDEX = os.getenv("QDRANT_INDEX", "haystack_studio")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11435")
OLLAMA_CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL", "qwen3.5:4b")
TOP_K = int(os.getenv("TOP_K", "4"))
MAX_DOCUMENTS = int(os.getenv("MAX_DOCUMENTS", "200"))
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "900"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "120"))
SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    "You are a helpful Haystack RAG assistant. Answer from the provided context and state when information is missing.",
)

PROMPT_TEMPLATE = """
{{ system_prompt }}

Context:
{% if documents %}
{% for document in documents %}
- {{ document.content }}
{% endfor %}
{% else %}
- No matching context was retrieved.
{% endif %}

Question: {{ query }}

Answer using the context when possible. If the answer is not in context, say so plainly.
"""


class PipelineWrapper(BasePipelineWrapper):
    def setup(self) -> None:
        self.document_store = QdrantDocumentStore(
            url=QDRANT_URL,
            index=QDRANT_INDEX,
            recreate_index=False,
            embedding_dim=768,
            return_embedding=False,
        )
        self._index_documents()
        self.query_pipeline = self._build_query_pipeline()

    def _build_query_pipeline(self) -> Pipeline:
        pipeline = Pipeline()
        pipeline.add_component(
            "text_embedder",
            OllamaTextEmbedder(
                model=os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text"),
                url=OLLAMA_BASE_URL,
            ),
        )
        pipeline.add_component(
            "retriever",
            QdrantEmbeddingRetriever(document_store=self.document_store, top_k=TOP_K),
        )
        pipeline.add_component("prompt_builder", PromptBuilder(template=PROMPT_TEMPLATE))
        pipeline.add_component(
            "llm",
            OllamaGenerator(
                model=OLLAMA_CHAT_MODEL,
                url=OLLAMA_BASE_URL,
                generation_kwargs={"temperature": 0.2},
            ),
        )
        pipeline.connect("text_embedder.embedding", "retriever.query_embedding")
        pipeline.connect("retriever.documents", "prompt_builder.documents")
        pipeline.connect("prompt_builder", "llm")
        return pipeline

    def _index_documents(self) -> None:
        documents = self._load_documents()
        writer = DocumentWriter(document_store=self.document_store, policy=DuplicatePolicy.OVERWRITE)
        embedder = OllamaDocumentEmbedder(
            model=os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text"),
            url=OLLAMA_BASE_URL,
        )
        indexing = Pipeline()
        indexing.add_component("cleaner", DocumentCleaner())
        indexing.add_component(
            "splitter",
            DocumentSplitter(split_by="word", split_length=CHUNK_SIZE, split_overlap=CHUNK_OVERLAP),
        )
        indexing.add_component("embedder", embedder)
        indexing.add_component("writer", writer)
        indexing.connect("cleaner.documents", "splitter.documents")
        indexing.connect("splitter.documents", "embedder.documents")
        indexing.connect("embedder.documents", "writer.documents")
        indexing.run({"cleaner": {"documents": documents}})
        log.info("Indexed {} source document(s) into Qdrant index '{}'", len(documents), QDRANT_INDEX)

    def _load_documents(self) -> list[Document]:
        text_files = sorted(DOCUMENTS_DIR.glob("**/*.txt"))[:MAX_DOCUMENTS]
        if not text_files:
            return [
                Document(
                    content=(
                        "Haystack Studio starter is running. Add .txt files under /workspace/documents "
                        "to build a richer local knowledge base."
                    ),
                    meta={"source": "starter-note"},
                )
            ]

        converter = TextFileToDocument()
        documents: list[Document] = []
        for text_file in text_files:
            result = converter.run(sources=[text_file])
            for document in result["documents"]:
                document.meta = {**document.meta, "source": str(text_file.relative_to(DOCUMENTS_DIR))}
                documents.append(document)
        return documents

    def _run_query(self, query: str) -> str:
        result = self.query_pipeline.run(
            {
                "text_embedder": {"text": query},
                "prompt_builder": {"query": query, "system_prompt": SYSTEM_PROMPT},
            }
        )
        replies = result.get("llm", {}).get("replies", [])
        if replies:
            return replies[0]
        return "No response was generated."

    def run_api(self, question: str) -> str:
        log.info("Running Haystack Studio API query: {}", question)
        return self._run_query(question)

    async def run_api_async(self, question: str) -> str:
        return self.run_api(question)

    async def run_chat_completion_async(
        self,
        model: str,
        messages: list[dict],
        body: dict,
    ) -> AsyncGenerator[str, None] | str:
        del model, body
        question = get_last_user_message(messages)
        if not question:
            return "Please provide a user message."
        reply = self._run_query(question)
        chat_reply = ChatMessage.from_assistant(reply)
        return chat_reply.text
