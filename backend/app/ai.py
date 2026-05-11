"""LLM wrapper — LiteLLM with Gemini primary + flash-lite fallback."""

import json
import logging
import os
import re
import time
from typing import Any

import litellm

from app.config import settings

if settings.gemini_api_key and not os.environ.get("GEMINI_API_KEY"):
    os.environ["GEMINI_API_KEY"] = settings.gemini_api_key

litellm.set_verbose = False

logger = logging.getLogger("app.ai")

PRIMARY_MODEL = "gemini/gemini-2.5-flash"
FALLBACK_MODEL = "gemini/gemini-2.5-flash-lite"


def call_llm(*, system: str, user: str, max_tokens: int = 1024) -> str:
    """Call the LLM with system + user messages; auto-falls back on rate limit / 5xx.

    Returns the assistant message text. Raises whatever litellm raises if both
    primary and fallback fail.
    """
    user_preview = user[:80].replace("\n", " ")
    logger.info("LLM call → %s (max_tokens=%d, user=%r…)", PRIMARY_MODEL, max_tokens, user_preview)
    t0 = time.perf_counter()
    try:
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
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        logger.error("LLM call FAILED in %.0fms — %s: %s", elapsed_ms, type(exc).__name__, exc)
        raise
    elapsed_ms = (time.perf_counter() - t0) * 1000
    content = response.choices[0].message.content
    model_used = getattr(response, "model", "unknown")
    logger.info(
        "LLM call OK in %.0fms — model=%s, chars=%d",
        elapsed_ms, model_used, len(content) if content else 0,
    )
    return content if content is not None else ""


def parse_json_response(text: str, fallback: Any) -> Any:
    """Strip optional markdown fences and parse JSON. Return fallback on error."""
    cleaned = re.sub(r"^```(?:json)?\n?|\n?```$", "", text.strip(), flags=re.MULTILINE)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return fallback
