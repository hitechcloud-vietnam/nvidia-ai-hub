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

CREATE TABLE IF NOT EXISTS recipe_verifications (
    slug TEXT PRIMARY KEY,
    verified_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipe_ratings (
    slug TEXT NOT NULL,
    score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipe_tips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'Anonymous operator',
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row

    async def execute_fetchone(sql: str, parameters=()):
        cursor = await db.execute(sql, parameters)
        try:
            return await cursor.fetchone()
        finally:
            await cursor.close()

    async def execute_fetchall(sql: str, parameters=()):
        cursor = await db.execute(sql, parameters)
        try:
            return await cursor.fetchall()
        finally:
            await cursor.close()

    db.execute_fetchone = execute_fetchone
    db.execute_fetchall = execute_fetchall
    return db


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA)
        await db.commit()
