# Production image — gunicorn + uvicorn workers.
# Local dev uses `uvicorn --reload` directly, not this image.

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install build deps for psycopg (binary wheel covers most cases but keep gcc as a fallback)
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --upgrade pip && pip install -e ".[prod]"

COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./
COPY schema.sql ./

EXPOSE 8000

# Workers = 2 * vCPUs + 1 — tune at deploy time via $WEB_CONCURRENCY
ENV WEB_CONCURRENCY=2
CMD ["sh", "-c", "alembic upgrade head && gunicorn -k uvicorn.workers.UvicornWorker -w ${WEB_CONCURRENCY} -b 0.0.0.0:8000 app.main:app"]
