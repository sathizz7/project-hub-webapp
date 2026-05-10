"""Application-level exceptions and FastAPI exception handlers.

All errors flow through one of three handlers and produce the
{status, message, data} envelope. Unhandled exceptions are caught
by the catchall handler and return a generic 500 (no internal-detail
leakage to clients).
"""

from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from app.responses import fail


class AppError(Exception):
    """Domain-level error raised by route functions.

    Carries the HTTP status code and optional data payload directly.
    Use this instead of raising HTTPException when you want to attach
    structured data to the failure response.
    """

    def __init__(
        self,
        message: str,
        *,
        status_code: int = 400,
        data: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.data = data


def register_exception_handlers(app: FastAPI) -> None:
    """Wire the three exception handlers onto a FastAPI instance."""

    @app.exception_handler(AppError)
    async def _handle_app_error(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=fail(message=exc.message, data=exc.data),
        )

    @app.exception_handler(HTTPException)
    async def _handle_http_exception(_request: Request, exc: HTTPException) -> JSONResponse:
        # exc.detail can be str or dict; coerce to string for the envelope's message
        message = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content=fail(message=message),
        )

    @app.exception_handler(Exception)
    async def _handle_unhandled(_request: Request, _exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=fail(message="Internal server error"),
        )
