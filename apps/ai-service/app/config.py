from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "TalentOS AI Service"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = False

    host: str = "0.0.0.0"
    port: int = 8000

    mongodb_uri: str = "mongodb://localhost:27017/talentos"
    api_url: str = "http://localhost:3001"
    api_internal_secret: str = ""

    # LLM provider: openai | anthropic | ollama
    llm_provider: str = "openai"
    llm_temperature: float = 0.0

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Anthropic (optional — requires langchain-anthropic)
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-haiku-latest"

    # Ollama (optional — requires langchain-ollama)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    # Embeddings + vector search
    embedding_provider: str = "openai"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    embedding_chunk_size: int = 800
    embedding_chunk_overlap: int = 120
    vector_collection_name: str = "document_embeddings"
    vector_index_name: str = "talentos_vector_index"
    vector_search_enabled: bool = True
    vector_num_candidates: int = 100
    vector_search_limit: int = 10

    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
