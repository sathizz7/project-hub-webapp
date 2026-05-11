"""LLM wrapper — LiteLLM with Gemini primary + flash-lite fallback."""

import json
import re
from typing import Any

import litellm

litellm.set_verbose = False

PRIMARY_MODEL = "gemini/gemini-2.5-flash"
FALLBACK_MODEL = "gemini/gemini-2.5-flash-lite"


def call_llm(*, system: str, user: str, max_tokens: int = 1024) -> str:
    """Call the LLM with system + user messages; auto-falls back on rate limit / 5xx.

    Returns the assistant message text. Raises whatever litellm raises if both
    primary and fallback fail.
    """
    response = litellm.completion(
        model=PRIMARY_MODEL,
        fallbacks=[FALLBACK_MODEL],
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=max_tokens,
        timeout=60,
    )
    content = response.choices[0].message.content
    return content if content is not None else ""


def parse_json_response(text: str, fallback: Any) -> Any:
    """Strip optional markdown fences and parse JSON. Return fallback on error."""
    cleaned = re.sub(r"^```(?:json)?\n?|\n?```$", "", text.strip(), flags=re.MULTILINE)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return fallback
