/**
 * 数据库层 — 初始化 + 通用工具
 */

let _initialized = false;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS anniversaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    caption TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    url TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_anniversaries_date ON anniversaries(date ASC);
`;

/**
 * 确保数据库表已创建（幂等，只执行一次）
 */
export async function ensureDB(db) {
  if (_initialized) return;
  await db.batch(SCHEMA.split(';').filter(s => s.trim()).map(s => db.prepare(s.trim())));
  _initialized = true;
}

/**
 * 从 URL 路径中提取资源 ID
 * 例如: /api/photos/42 → '42'
 */
export function extractId(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  // 如果最后一段是数字则视为 ID
  if (/^\d+$/.test(last)) return parseInt(last, 10);
  return null;
}
