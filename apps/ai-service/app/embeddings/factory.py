from enum import Enum

from langchain_core.embeddings import Embeddings

from app.config import Settings


class EmbeddingConfigurationError(Exception):
    """Raised when embedding provider settings are invalid."""


def create_embeddings(settings: Settings) -> Embeddings:
    provider = settings.embedding_provider.lower().strip()

    if provider == "openai":
        if not settings.openai_api_key:
            raise EmbeddingConfigurationError(
                "OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai"
            )
        from langchain_openai import OpenAIEmbeddings

        return OpenAIEmbeddings(
            model=settings.embedding_model,
            api_key=settings.openai_api_key,
            dimensions=settings.embedding_dimensions,
        )

    raise EmbeddingConfigurationError(
        f"Unsupported embedding provider '{settings.embedding_provider}'. "
        "Supported: openai"
    )
