import asyncio
import json
import functools
from backend.config import settings

# Cached clients — created once, reused across requests
_clients = {}


def _get_openai_client():
    if "openai" not in _clients:
        from openai import OpenAI
        _clients["openai"] = OpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
        )
    return _clients["openai"]


def _get_anthropic_client():
    if "anthropic" not in _clients:
        import anthropic
        _clients["anthropic"] = anthropic.Anthropic(api_key=settings.llm_api_key)
    return _clients["anthropic"]


def _call_llm_sync(system_prompt: str, user_message: str, model: str) -> str:
    provider = settings.llm_provider.lower()

    if provider == "openai":
        client = _get_openai_client()
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        )
        return response.choices[0].message.content or ""

    elif provider == "anthropic":
        client = _get_anthropic_client()
        # Mark system prompt for ephemeral prompt caching (5-min TTL).
        # First call: ~25% write premium; subsequent hits: ~10% of input cost.
        response = client.messages.create(
            model=model,
            max_tokens=4096,
            system=[{
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},
            }],
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text

    elif provider == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=settings.llm_api_key)
        gen_model = genai.GenerativeModel(
            model_name=model,
            system_instruction=system_prompt,
        )
        response = gen_model.generate_content(user_message)
        return response.text

    else:
        raise ValueError(f"Unknown LLM provider: {provider}")


async def call_llm(system_prompt: str, user_message: str, use_mini: bool = False) -> str:
    """Async entry point for all LLM calls. Runs blocking SDK calls in a thread pool.

    use_mini=True routes to the cheaper model (e.g. gpt-4o-mini) —
    used for high-frequency, simpler tasks like evaluating quiz answers.
    """
    model = settings.llm_model_mini if use_mini else settings.llm_model
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, functools.partial(_call_llm_sync, system_prompt, user_message, model)
    )
    return result or ""


async def call_llm_json(system_prompt: str, user_message: str, use_mini: bool = False, retries: int = 1) -> dict:
    """Call LLM and parse response as JSON, with retry on parse failure."""
    last_raw = ""
    for attempt in range(1 + retries):
        raw = await call_llm(system_prompt, user_message, use_mini=use_mini)
        last_raw = raw
        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            if attempt < retries:
                continue
    return {"_raw": last_raw, "_parse_failed": True}
