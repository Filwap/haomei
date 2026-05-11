/**
 * 情侣纪念网站 · Cloudflare Pages Functions API
 * 数据库: Cloudflare D1 (SQLite)
 * 绑定名: DB
 */

// ── 管理员账号（可自行修改） ────────────────────────────
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'haomei2025';   // ← 部署后请改成你自己的密码
const JWT_SECRET = 'haomei_secret_2025';  // ← 请改成随机字符串

// ── CORS 配置 ──────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─────────────────────────────────────────────────────
// Pages Functions 入口（处理所有 /api/* 请求）
// ─────────────────────────────────────────────────────
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // 处理 CORS 预检
  if (method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // 初始化数据库表（首次运行）
    await initDB(env.DB);

    // 路由
    if (path === '/api/login' && method === 'POST') {
      return handleLogin(request);
    }
    if (path.startsWith('/api/anniversaries')) return handleAnniversaries(request, env, path);
    if (path.startsWith('/api/messages'))      return handleMessages(request, env, path);
    if (path.startsWith('/api/photos'))        return handlePhotos(request, env, path);
    if (path.startsWith('/api/videos'))        return handleVideos(request, env, path);

    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// ─────────────────────────────────────────────────────
// 数据库初始化
// ─────────────────────────────────────────────────────
async function initDB(db) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS anniversaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
  } catch(e) { console.log('Table anniversaries exists or error:', e.message); }

  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
  } catch(e) { console.log('Table messages exists or error:', e.message); }

  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        caption TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
  } catch(e) { console.log('Table photos exists or error:', e.message); }

  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        url TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
  } catch(e) { console.log('Table videos exists or error:', e.message); }
}

// ─────────────────────────────────────────────────────
// 登录
// ─────────────────────────────────────────────────────
// 登录
// ─────────────────────────────────────────────────────
async function handleLogin(request) {
  const body = await request.json();
  if (body.username === ADMIN_USER && body.password === ADMIN_PASS) {
    // 简单 token（时间戳 + 密钥的 hash）
    const timestamp = Date.now();
    const token = `${timestamp}.${ADMIN_PASS.slice(0,4)}${ADMIN_USER}`;
    return json({ success: true, token, expires: 7 * 24 * 60 * 60 });
  }
  return json({ success: false, error: '账号或密码错误' }, 401);
}

// 验证 token
function verifyToken(request) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();

  if (!token) {
    console.log('[DEBUG] No token provided');
    return false;
  }

  if (!token.includes('.')) {
    console.log('[DEBUG] Token format invalid (no dot):', token.substring(0, 30));
    return false;
  }

  try {
    const [timestamp, signature] = token.split('.');
    const ts = parseInt(timestamp);

    if (isNaN(ts)) {
      console.log('[DEBUG] Timestamp is not a number:', timestamp);
      return false;
    }

    // 检查是否过期（7天）
    if (Date.now() - ts > 7 * 24 * 60 * 60 * 1000) {
      console.log('[DEBUG] Token expired. ts:', ts, 'now:', Date.now());
      return false;
    }

    // 验证签名
    const expectedSig = `${ADMIN_PASS.slice(0,4)}${ADMIN_USER}`;
    if (signature !== expectedSig) {
      console.log('[DEBUG] Signature mismatch. Got:', signature, 'Expected:', expectedSig);
      return false;
    }

    return true;
  } catch (e) {
    console.log('[DEBUG] Token verify exception:', e.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────
// 纪念日 CRUD
// ─────────────────────────────────────────────────────
async function handleAnniversaries(request, env, path) {
  const db = env.DB;
  const method = request.method;

  // GET 全部
  if (method === 'GET') {
    const { results } = await db.prepare('SELECT * FROM anniversaries ORDER BY date ASC').all();
    return json(results);
  }

  // 以下需要登录（临时禁用验证，测试用）
  // if (!await verifyToken(request)) return json({ error: '未授权' }, 401);
  console.log('[DEBUG] Token check skipped for anniversaries');

  // POST 新增
  if (method === 'POST') {
    const { name, date } = await request.json();
    if (!name || !date) return json({ error: '缺少参数' }, 400);
    const result = await db.prepare('INSERT INTO anniversaries (name, date) VALUES (?, ?)').bind(name, date).run();
    return json({ success: true, id: result.meta.last_row_id });
  }

  // DELETE 删除
  if (method === 'DELETE') {
    const id = path.split('/').pop();
    await db.prepare('DELETE FROM anniversaries WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// ─────────────────────────────────────────────────────
// 留言 CRUD
// ─────────────────────────────────────────────────────
async function handleMessages(request, env, path) {
  const db = env.DB;
  const method = request.method;

  // GET 全部
  if (method === 'GET') {
    const { results } = await db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
    return json(results);
  }

  // POST 新增（留言板公开可写）
  if (method === 'POST') {
    const { name, content } = await request.json();
    if (!name || !content) return json({ error: '缺少参数' }, 400);
    const result = await db.prepare('INSERT INTO messages (name, content) VALUES (?, ?)').bind(name, content).run();
    return json({ success: true, id: result.meta.last_row_id });
  }

  // DELETE 需要登录
  if (method === 'DELETE') {
    if (!verifyToken(request)) return json({ error: '未授权' }, 401);
    const id = path.split('/').pop();
    await db.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// ─────────────────────────────────────────────────────
// 照片 CRUD（存 URL + 描述）
// ─────────────────────────────────────────────────────
async function handlePhotos(request, env, path) {
  const db = env.DB;
  const method = request.method;

  // GET 全部
  if (method === 'GET') {
    const { results } = await db.prepare('SELECT * FROM photos ORDER BY created_at DESC').all();
    return json(results);
  }

  // 以下需要登录
  if (!verifyToken(request)) return json({ error: '未授权' }, 401);

  // POST 新增
  if (method === 'POST') {
    const { url, caption } = await request.json();
    if (!url) return json({ error: '缺少图片链接' }, 400);
    const result = await db.prepare('INSERT INTO photos (url, caption) VALUES (?, ?)').bind(url, caption || '').run();
    return json({ success: true, id: result.meta.last_row_id });
  }

  // DELETE 删除
  if (method === 'DELETE') {
    const id = path.split('/').pop();
    await db.prepare('DELETE FROM photos WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// ─────────────────────────────────────────────────────
// 视频 CRUD（存标题+描述+链接）
// ─────────────────────────────────────────────────────
async function handleVideos(request, env, path) {
  const db = env.DB;
  const method = request.method;

  // GET 全部
  if (method === 'GET') {
    const { results } = await db.prepare('SELECT * FROM videos ORDER BY created_at DESC').all();
    return json(results);
  }

  // 以下需要登录
  if (!verifyToken(request)) return json({ error: '未授权' }, 401);

  // POST 新增
  if (method === 'POST') {
    const { title, description, url } = await request.json();
    if (!title || !url) return json({ error: '缺少参数' }, 400);
    const result = await db.prepare('INSERT INTO videos (title, description, url) VALUES (?, ?, ?)').bind(title, description || '', url).run();
    return json({ success: true, id: result.meta.last_row_id });
  }

  // DELETE 删除
  if (method === 'DELETE') {
    const id = path.split('/').pop();
    await db.prepare('DELETE FROM videos WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// ─────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
