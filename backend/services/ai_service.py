"""
AI Provider service - BYO API key management with dynamic model discovery
"""
import logging
from typing import Optional
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


# ─── Provider endpoints ────────────────────────────────────────────────────────

PROVIDER_CONFIG = {
    "gemini": {
        "models_url": "https://generativelanguage.googleapis.com/v1beta/models",
        "generate_url": "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        "auth_header": None,  # Uses query param
        "preferred_models": ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    },
    "groq": {
        "models_url": "https://api.groq.com/openai/v1/models",
        "generate_url": "https://api.groq.com/openai/v1/chat/completions",
        "auth_header": "Authorization",
        "preferred_models": ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "llama3-70b-8192"],
    },
    "openrouter": {
        "models_url": "https://openrouter.ai/api/v1/models",
        "generate_url": "https://openrouter.ai/api/v1/chat/completions",
        "auth_header": "Authorization",
        "preferred_models": ["google/gemini-2.0-flash-001", "anthropic/claude-3-haiku", "meta-llama/llama-3-70b-instruct"],
    },
}


async def list_models(provider: str, api_key: str) -> list[dict]:
    """Fetch available models from provider."""
    config = PROVIDER_CONFIG.get(provider)
    if not config:
        raise ValueError(f"Unknown provider: {provider}")

    headers = {"Content-Type": "application/json"}
    params = {}

    if provider == "gemini":
        params["key"] = api_key
    else:
        headers["Authorization"] = f"Bearer {api_key}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(config["models_url"], headers=headers, params=params)
        response.raise_for_status()
        data = response.json()

    if provider == "gemini":
        models = [
            {"id": m["name"].replace("models/", ""), "name": m.get("displayName", m["name"])}
            for m in data.get("models", [])
            if "generateContent" in m.get("supportedGenerationMethods", [])
        ]
    else:
        models = [
            {"id": m["id"], "name": m.get("id", "")}
            for m in data.get("data", [])
        ]

    return models


async def select_best_model(provider: str, api_key: str, preferred: Optional[str] = None) -> str:
    """Select the most efficient available model."""
    if preferred:
        return preferred

    config = PROVIDER_CONFIG.get(provider, {})
    try:
        available = await list_models(provider, api_key)
        available_ids = {m["id"] for m in available}

        for model in config.get("preferred_models", []):
            if model in available_ids:
                return model

        # Fallback to first available
        if available:
            return available[0]["id"]
    except Exception as e:
        logger.warning(f"Could not fetch models for {provider}: {e}")

    # Hard fallback
    return config.get("preferred_models", ["gpt-3.5-turbo"])[0]


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def generate_text(
    provider: str,
    api_key: str,
    prompt: str,
    model: Optional[str] = None,
    system_prompt: Optional[str] = None,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    """Generate text using any supported provider."""
    if model is None:
        model = await select_best_model(provider, api_key)

    if provider == "gemini":
        return await _generate_gemini(api_key, model, prompt, system_prompt, max_tokens, temperature)
    else:
        return await _generate_openai_compat(provider, api_key, model, prompt, system_prompt, max_tokens, temperature)


async def _generate_gemini(api_key, model, prompt, system_prompt, max_tokens, temperature):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    contents = []
    if system_prompt:
        contents.append({"role": "user", "parts": [{"text": system_prompt}]})
        contents.append({"role": "model", "parts": [{"text": "Entendido, seguiré esas instrucciones."}]})
    contents.append({"role": "user", "parts": [{"text": prompt}]})

    payload = {
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": temperature,
        },
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload, params={"key": api_key})
        response.raise_for_status()
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]


async def _generate_openai_compat(provider, api_key, model, prompt, system_prompt, max_tokens, temperature):
    config = PROVIDER_CONFIG[provider]
    url = config["generate_url"]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if provider == "openrouter":
        headers["HTTP-Referer"] = "https://iapost.app"
        headers["X-Title"] = "IAPost"

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def validate_api_key(provider: str, api_key: str) -> tuple[bool, str, list]:
    """Test API key and return (is_valid, message, models)."""
    try:
        models = await list_models(provider, api_key)
        return True, f"✅ Conexión exitosa. {len(models)} modelos disponibles.", models
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            return False, "❌ API Key inválida o sin permisos.", []
        return False, f"❌ Error HTTP {e.response.status_code}: {e.response.text[:200]}", []
    except Exception as e:
        return False, f"❌ Error de conexión: {str(e)}", []
