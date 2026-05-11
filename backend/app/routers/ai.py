"""AI router — stateless LLM endpoints. CEO-only."""

import logging

from fastapi import APIRouter, Depends

from app.ai import call_llm, parse_json_response
from app.auth import require_roles
from app.prompts.generate_plan import GENERATE_PLAN_SYSTEM_PROMPT
from app.prompts.review import REVIEW_SYSTEM_PROMPT
from app.prompts.suggest_stack import SUGGEST_STACK_SYSTEM_PROMPT
from app.responses import ok
from app.schemas.ai import GeneratePlanRequest, ReviewRequest, SuggestStackRequest


logger = logging.getLogger("app.routers.ai")

router = APIRouter(
    prefix="/api/v1/ai",
    tags=["ai"],
    dependencies=[Depends(require_roles("ceo"))],
)


_PLAN_FALLBACK: dict = {
    "summary": "",
    "phases": [],
    "milestones": [],
    "kill_criteria": [],
    "risks": [],
    "tech_stack": [],
}


@router.post("/generate-plan")
def generate_plan(payload: GeneratePlanRequest) -> dict:
    logger.info("ai/generate-plan: type=%s, req_chars=%d", payload.type, len(payload.requirement))
    user_msg = f"Project type: {payload.type}\n\nRequirement:\n{payload.requirement}"
    text = call_llm(system=GENERATE_PLAN_SYSTEM_PROMPT, user=user_msg, max_tokens=2048)
    parsed = parse_json_response(text, fallback=_PLAN_FALLBACK)
    if not isinstance(parsed, dict):
        logger.warning("ai/generate-plan: LLM returned non-dict — using fallback. Raw: %r", text[:200])
        parsed = dict(_PLAN_FALLBACK)
    else:
        logger.info("ai/generate-plan: parsed plan with %d phases, %d milestones",
                    len(parsed.get("phases", [])), len(parsed.get("milestones", [])))
    return ok(data=parsed)


@router.post("/review")
def review(payload: ReviewRequest) -> dict:
    logger.info("ai/review: title=%r, type=%s", payload.submission_title, payload.submission_type)
    user_msg = (
        f"Title: {payload.submission_title}\n"
        f"Type: {payload.submission_type}\n"
        f"Description: {payload.description or '(none)'}\n"
        f"Link: {payload.link or '(none)'}"
    )
    text = call_llm(system=REVIEW_SYSTEM_PROMPT, user=user_msg, max_tokens=512)
    feedback = text.strip()
    logger.info("ai/review: feedback %d chars", len(feedback))
    return ok(data={"feedback": feedback})


@router.post("/suggest-stack")
def suggest_stack(payload: SuggestStackRequest) -> dict:
    logger.info("ai/suggest-stack: desc_chars=%d", len(payload.description))
    text = call_llm(system=SUGGEST_STACK_SYSTEM_PROMPT, user=payload.description, max_tokens=512)
    parsed = parse_json_response(text, fallback=[])
    if not isinstance(parsed, list):
        logger.warning("ai/suggest-stack: LLM returned non-list — using empty. Raw: %r", text[:200])
        parsed = []
    else:
        logger.info("ai/suggest-stack: %d techs returned", len(parsed))
    return ok(data={"tech_stack": parsed})
