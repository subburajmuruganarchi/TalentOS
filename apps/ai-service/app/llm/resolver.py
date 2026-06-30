from app.config import Settings
from app.llm.factory import LlmConfigurationError


def resolve_model_name(settings: Settings) -> str:
    provider = settings.llm_provider.lower().strip()
    if provider == "openai":
        return settings.openai_model
    if provider == "anthropic":
        return settings.anthropic_model
    if provider == "ollama":
        return settings.ollama_model
    raise LlmConfigurationError(f"Unsupported LLM provider: {provider}")
