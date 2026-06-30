import logging
from typing import Any

from langchain_core.embeddings import Embeddings
from pymongo.collection import Collection

from app.config import Settings
from app.db.mongo import ensure_embedding_indexes, get_embeddings_collection, utc_now
from app.embeddings.chunker import chunk_text
from app.vector.similarity import average_max_chunk_similarity

logger = logging.getLogger(__name__)


class VectorRepository:
    def __init__(self, settings: Settings, embeddings: Embeddings) -> None:
        self._settings = settings
        self._embeddings = embeddings
        self._collection: Collection = get_embeddings_collection(settings)
        ensure_embedding_indexes(self._collection)

    def index_entity(
        self,
        *,
        organization_id: str,
        entity_type: str,
        entity_id: str,
        text: str,
        job_id: str | None = None,
        candidate_id: str | None = None,
    ) -> list[dict[str, Any]]:
        chunks = chunk_text(
            text,
            chunk_size=self._settings.embedding_chunk_size,
            chunk_overlap=self._settings.embedding_chunk_overlap,
        )
        vectors = self._embeddings.embed_documents(chunks)

        self._collection.delete_many(
            {
                "organization_id": organization_id,
                "entity_type": entity_type,
                "entity_id": entity_id,
            }
        )

        documents: list[dict[str, Any]] = []
        for index, (chunk, vector) in enumerate(zip(chunks, vectors, strict=True)):
            documents.append(
                {
                    "organization_id": organization_id,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "job_id": job_id,
                    "candidate_id": candidate_id,
                    "chunk_index": index,
                    "content": chunk,
                    "embedding": vector,
                    "updated_at": utc_now(),
                }
            )

        if documents:
            self._collection.insert_many(documents)

        return documents

    def load_entity_embeddings(
        self,
        organization_id: str,
        entity_type: str,
        entity_id: str,
    ) -> list[dict[str, Any]]:
        return list(
            self._collection.find(
                {
                    "organization_id": organization_id,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                },
                {"embedding": 1, "content": 1, "chunk_index": 1},
            ).sort("chunk_index", 1)
        )

    def compute_similarity(
        self,
        organization_id: str,
        job_id: str,
        candidate_id: str,
    ) -> tuple[float, list[str], list[str]]:
        job_docs = self.load_entity_embeddings(
            organization_id,
            "job_description",
            job_id,
        )
        candidate_docs = self.load_entity_embeddings(
            organization_id,
            "candidate_profile",
            candidate_id,
        )

        if not job_docs or not candidate_docs:
            return 0.0, [], []

        job_vectors = [doc["embedding"] for doc in job_docs]
        candidate_vectors = [doc["embedding"] for doc in candidate_docs]

        atlas_score = self._vector_search_score(
            organization_id=organization_id,
            candidate_id=candidate_id,
            query_vector=self._average_vector(job_vectors),
        )

        local_score = average_max_chunk_similarity(job_vectors, candidate_vectors)
        score = atlas_score if atlas_score is not None else local_score

        return (
            score,
            [doc["content"] for doc in job_docs[:3]],
            [doc["content"] for doc in candidate_docs[:3]],
        )

    def _vector_search_score(
        self,
        *,
        organization_id: str,
        candidate_id: str,
        query_vector: list[float],
    ) -> float | None:
        if not self._settings.vector_search_enabled:
            return None

        pipeline = [
            {
                "$vectorSearch": {
                    "index": self._settings.vector_index_name,
                    "path": "embedding",
                    "queryVector": query_vector,
                    "numCandidates": self._settings.vector_num_candidates,
                    "limit": self._settings.vector_search_limit,
                    "filter": {
                        "organization_id": organization_id,
                        "entity_type": "candidate_profile",
                        "entity_id": candidate_id,
                    },
                }
            },
            {
                "$project": {
                    "content": 1,
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
        ]

        try:
            results = list(self._collection.aggregate(pipeline))
            if not results:
                return None
            raw = float(results[0].get("score", 0))
            return max(0.0, min(1.0, raw))
        except Exception as exc:
            logger.warning("MongoDB vector search unavailable, using local similarity: %s", exc)
            return None

    @staticmethod
    def _average_vector(vectors: list[list[float]]) -> list[float]:
        if not vectors:
            return []
        length = len(vectors[0])
        totals = [0.0] * length
        for vector in vectors:
            for index, value in enumerate(vector):
                totals[index] += value
        return [value / len(vectors) for value in totals]
