from langchain_core.language_models.chat_models import BaseChatModel

from app.config import Settings


class LlmConfigurationError(Exception):
    """Raised when the configured LLM provider is missing required settings."""


def create_chat_model(settings: Settings) -> BaseChatModel:
    provider = settings.llm_provider.lower().strip()

    if provider == "openai":
        return _create_openai_model(settings)
    if provider == "anthropic":
        return _create_anthropic_model(settings)
    if provider == "ollama":
        return _create_ollama_model(settings)

    raise LlmConfigurationError(
        f"Unsupported LLM provider '{settings.llm_provider}'. "
        "Supported: openai, anthropic, ollama"
    )


def _create_openai_model(settings: Settings) -> BaseChatModel:
    if not settings.openai_api_key:
        raise LlmConfigurationError("OPENAI_API_KEY is required when LLM_PROVIDER=openai")

    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        temperature=settings.llm_temperature,
    )


def _create_anthropic_model(settings: Settings) -> BaseChatModel:
    if not settings.anthropic_api_key:
        raise LlmConfigurationError(
            "ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic"
        )

    try:
        from langchain_anthropic import ChatAnthropic
    except ImportError as exc:
        raise LlmConfigurationError(
            "Install langchain-anthropic to use LLM_PROVIDER=anthropic"
        ) from exc

    return ChatAnthropic(
        model=settings.anthropic_model,
        api_key=settings.anthropic_api_key,
        temperature=settings.llm_temperature,
    )


def _create_ollama_model(settings: Settings) -> BaseChatModel:
    try:
        from langchain_ollama import ChatOllama
    except ImportError as exc:
        raise LlmConfigurationError(
            "Install langchain-ollama to use LLM_PROVIDER=ollama"
        ) from exc

    return ChatOllama(
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
        temperature=settings.llm_temperature,
    )
