"""FastAPI application factory.

- Wires CORSMiddleware from settings.allowed_origins.
- Registers exception handlers (envelope-shaped failure responses).
- Includes the health router (Phase 1).
- Manages the connection pool lifecycle via FastAPI lifespan.

Future phases: include auth, users, projects, ... routers.
"""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import close_pool, init_pool
from app.exceptions import register_exception_handlers
from app.routers import (
    ai, auth, capture, checkpoints, extensions, feedback, health, inbox, leaves,
    phases, projects, submissions, tasks, users,
)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Open the DB pool on startup, close on shutdown."""
    init_pool()
    try:
        yield
    finally:
        close_pool()


app = FastAPI(
    title="ProjectHub API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(phases.router)
app.include_router(tasks.router)
app.include_router(submissions.router)
app.include_router(feedback.router)
app.include_router(checkpoints.router)
app.include_router(inbox.router)
app.include_router(leaves.router)
app.include_router(extensions.router)
app.include_router(capture.router)
app.include_router(ai.router)
