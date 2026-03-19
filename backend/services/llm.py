from backend.config import settings


def call_llm(system_prompt: str, user_message: str, use_mini: bool = False) -> str:
    """Single entry point for all LLM calls.

    use_mini=True routes to the cheaper model (e.g. gpt-4o-mini) —
    used for high-frequency, simpler tasks like evaluating quiz answers.
    """
    provider = settings.llm_provider.lower()
    model = settings.llm_model_mini if use_mini else settings.llm_model

    if provider == "openai":
        return _call_openai(system_prompt, user_message, model)
    elif provider == "anthropic":
        return _call_anthropic(system_prompt, user_message, model)
    elif provider == "gemini":
        return _call_gemini(system_prompt, user_message, model)
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")


def _call_openai(system_prompt: str, user_message: str, model: str) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=settings.llm_api_key)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    )
    return response.choices[0].message.content


def _call_anthropic(system_prompt: str, user_message: str, model: str) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=settings.llm_api_key)
    response = client.messages.create(
        model=model,
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text


def _call_gemini(system_prompt: str, user_message: str, model: str) -> str:
    import google.generativeai as genai
    genai.configure(api_key=settings.llm_api_key)
    gen_model = genai.GenerativeModel(
        model_name=model,
        system_instruction=system_prompt,
    )
    response = gen_model.generate_content(user_message)
    return response.text
