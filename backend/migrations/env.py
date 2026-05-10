"""Alembic environment — wires settings.db_url into the migration runner."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import settings

# Alembic Config object
config = context.config

# Override the sqlalchemy.url placeholder with the runtime DB URL.
# Force the psycopg v3 driver — SQLAlchemy's default postgresql:// scheme
# tries to load psycopg2 (v2). We use psycopg v3 in app.db; no need to
# install psycopg2 just for migrations.
config.set_main_option(
    "sqlalchemy.url",
    settings.db_url.replace("postgresql://", "postgresql+psycopg://", 1),
)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# We don't use SQLAlchemy ORM models — migrations are raw SQL.
target_metadata = None


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — emits SQL to stdout."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
