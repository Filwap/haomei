/**
 * Pages Functions · 统一入口
 * 所有 /api/* 请求都会路由到这里
 */

// ── 管理员账号 ──────────────────────────────────────────
const ADMIN_USER = 'admin';
const ADMIN_PASS = '010403';
const JWT_SECRET = 'haomei_secret_2025';

// ── CORS 配置 ──────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequest(context) {
  const { request, env } = context;

  // CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // 路由分发（数据库表已在 D1 控制台手动创建，无需重复初始化）
    if (path === '/api/login' && request.method === 'POST') {
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

// ── 登录 ───────────────────────────────────────────────
async function handleLogin(request) {
  const body = await request.json();
  if (body.username === ADMIN_USER && body.password === ADMIN_PASS) {
    const payload = { user: ADMIN_USER, exp: Date.now() + 24 * 3600 * 1000 };
    const token = btoa(JSON.stringify(payload)) + '.' + await sign(JSON.stringify(payload));
    return json({ success: true, token });
  }
  return json({ success: false, error: '账号或密码错误' }, 401);
}

// 验证 token
async function verifyToken(request) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return false;
  try {
    const [payloadB64] = token.split('.');
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

// 简单签名
async function sign(data) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// ── 纪念日 CRUD ─────────────────────────────────────────
async function handleAnniversaries(request, env, path) {
  const db = env.DB;
  const method = request.method;

  if (method === 'GET') {
    const { results } = await db.prepare('SELECT * FROM anniversaries ORDER BY date ASC').all();
    return json(results);
  }

  if (!await verifyToken(request)) return json({ error: '未授权' }, 401);

  if (method === 'POST') {
    const { name, date } = await request.json();
    if (!name || !date) return json({ error: '缺少参数' }, 400);
    const result = await db.prepare('INSERT INTO anniversaries (name, date) VALUES (?, ?)').bind(name, date).run();
    return json({ success: true, id: result.meta.last_row_id });
  }

  if (method === 'DELETE') {
    const id = path.split('/').pop();
    await db.prepare('DELETE FROM anniversaries WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// ── 留言 CRUD ───────────────────────────────────────────
async function handleMessages(request, env, path) {
  const db = env.DB;
  const method = request.method;

  if (method === 'GET') {
    const { results } = await db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
    return json(results);
  }

  if (method === 'POST') {
    const { name, content } = await request.json();
    if (!name || !content) return json({ error: '缺少参数' }, 400);
    const result = await db.prepare('INSERT INTO messages (name, content) VALUES (?, ?)').bind(name, content).run();
    return json({ success: true, id: result.meta.last_row_id });
  }

  if (method === 'DELETE') {
    if (!await verifyToken(request)) return json({ error: '未授权' }, 401);
    const id = path.split('/').pop();
    await db.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// ── 照片 CRUD ───────────────────────────────────────────
async function handlePhotos(request, env, path) {
  const db = env.DB;
  const method = request.method;

  if (method === 'GET') {
    const { results } = await db.prepare('SELECT * FROM photos ORDER BY created_at DESC').all();
    return json(results);
  }

  if (!await verifyToken(request)) return json({ error: '未授权' }, 401);

  if (method === 'POST') {
    const { url, caption } = await request.json();
    if (!url) return json({ error: '缺少图片链接' }, 400);
    const result = await db.prepare('INSERT INTO photos (url, caption) VALUES (?, ?)').bind(url, caption || '').run();
    return json({ success: true, id: result.meta.last_row_id });
  }

  if (method === 'DELETE') {
    const id = path.split('/').pop();
    await db.prepare('DELETE FROM photos WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// ── 视频 CRUD ───────────────────────────────────────────
async function handleVideos(request, env, path) {
  const db = env.DB;
  const method = request.method;

  if (method === 'GET') {
    const { results } = await db.prepare('SELECT * FROM videos ORDER BY created_at DESC').all();
    return json(results);
  }

  if (!await verifyToken(request)) return json({ error: '未授权' }, 401);

  if (method === 'POST') {
    const { title, description, url } = await request.json();
    if (!title || !url) return json({ error: '缺少参数' }, 400);
    const result = await db.prepare('INSERT INTO videos (title, description, url) VALUES (?, ?, ?)').bind(title, description || '', url).run();
    return json({ success: true, id: result.meta.last_row_id });
  }

  if (method === 'DELETE') {
    const id = path.split('/').pop();
    await db.prepare('DELETE FROM videos WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// ── 工具函数 ───────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
