import aiosqlite
from daemon.config import settings

DB_PATH = str(settings.db_path)

SCHEMA = """
CREATE TABLE IF NOT EXISTS installed_recipes (
    slug TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'installed',
    installed_at TEXT NOT NULL DEFAULT (datetime('now')),
    compose_project TEXT
);
"""


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA)
        await db.commit()
