/**
 * Haomei API — Cloudflare Pages Functions
 *
 * 架构: Layered Router Pattern
 *   请求 → _middleware (CORS) → [[path]].js (路由分发 + 认证 + 校验 → DB 操作)
 *
 * 数据库: Cloudflare D1 (binding: DB)
 * 认证:   HMAC-SHA256 signed token (见 auth.js)
 */

import { generateToken, verifyToken, validateCredentials } from './auth.js';
import { ensureDB, extractId } from './db.js';
import { str, url as urlValidator, dateStr } from './validators.js';
import { checkRateLimit } from './rate-limit.js';

// ── 响应工具 ────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── 路由入口 ─────────────────────────────────────────────

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // CORS 预检
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await ensureDB(env.DB);

    // ── 路由表 ──────────────────────────────────────────
    if (pathname === '/api/login' && method === 'POST') {
      return handleLogin(request, env);
    }

    if (pathname.startsWith('/api/anniversaries')) {
      return handleAnniversaries(request, env, pathname, method);
    }
    if (pathname.startsWith('/api/messages')) {
      return handleMessages(request, env, pathname, method);
    }
    if (pathname.startsWith('/api/photos')) {
      return handlePhotos(request, env, pathname, method);
    }
    if (pathname.startsWith('/api/videos')) {
      return handleVideos(request, env, pathname, method);
    }

    return json({ error: 'Not found' }, 404);

  } catch (e) {
    console.error('[API Error]', e.message);
    return json({ error: 'Internal server error' }, 500);
  }
}

// ── 认证中间件（需要写操作的端点使用） ─────────────────────

async function requireAuth(request, env) {
  const payload = await verifyToken(request, env);
  if (!payload) return null;
  return payload;
}

// ══════════════════════════════════════════════════════════
// 端点处理函数
// ══════════════════════════════════════════════════════════

// ── 登录 ─────────────────────────────────────────────────
async function handleLogin(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return json({ success: false, error: '请求格式错误' }, 400); }

  const cred = validateCredentials(body, env);
  if (!cred.ok) {
    return json({ success: false, error: '账号或密码错误' }, 401);
  }

  const token = await generateToken(env);
  return json({
    success: true,
    token,
    expires: 7 * 24 * 60 * 60, // 秒
  });
}

// ── 纪念日 CRUD ──────────────────────────────────────────
async function handleAnniversaries(request, env, path, method) {
  const db = env.DB;

  // GET: 公开读取
  if (method === 'GET') {
    const { results } = await db.prepare('SELECT * FROM anniversaries ORDER BY date ASC').all();
    return json(results);
  }

  // POST / DELETE: 需要认证
  const auth = await requireAuth(request, env);
  if (!auth) return json({ error: '未授权' }, 401);

  if (method === 'POST') {
    const body = await request.json();
    const nameErr = str(body.name, '名称');
    const dateErr = dateStr(body.date, '日期');
    if (nameErr || dateErr) {
      return json({ error: nameErr || dateErr }, 400);
    }
    const result = await db.prepare(
      'INSERT INTO anniversaries (name, date) VALUES (?, ?)'
    ).bind(body.name.trim(), body.date.trim()).run();
    return json({ success: true, id: result.meta.last_row_id });
  }

  if (method === 'DELETE') {
    const id = extractId(path);
    if (!id) return json({ error: '无效的 ID' }, 400);
    await db.prepare('DELETE FROM anniversaries WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// ── 留言板 CRUD ─────────────────────────────────────────
async function handleMessages(request, env, path, method) {
  const db = env.DB;

  // GET: 公开读取
  if (method === 'GET') {
    const { results } = await db.prepare(
      'SELECT * FROM messages ORDER BY created_at DESC'
    ).all();
    return json(results);
  }

  // POST: 公开写入（带限流）
  if (method === 'POST') {
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateResult = checkRateLimit(clientIp, { windowMs: 60_000, maxRequests: 5 });
    if (!rateResult.ok) {
      return json({ error: '操作过于频繁，请稍后再试' }, 429);
    }

    const body = await request.json();
    const nameErr = str(body.name, '昵称', { required: true, max: 50 });
    const contentErr = str(body.content, '留言内容', { required: true, max: 1000 });
    if (nameErr || contentErr) {
      return json({ error: nameErr || contentErr }, 400);
    }
    const result = await db.prepare(
      'INSERT INTO messages (name, content) VALUES (?, ?)'
    ).bind(body.name.trim(), body.content.trim()).run();
    return json({ success: true, id: result.meta.last_row_id });
  }

  // DELETE: 需要认证
  const auth = await requireAuth(request, env);
  if (!auth) return json({ error: '未授权' }, 401);

  if (method === 'DELETE') {
    const id = extractId(path);
    if (!id) return json({ error: '无效的 ID' }, 400);
    await db.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// ── 照片 CRUD ────────────────────────────────────────────
async function handlePhotos(request, env, path, method) {
  const db = env.DB;

  // GET: 公开读取
  if (method === 'GET') {
    const { results } = await db.prepare(
      'SELECT * FROM photos ORDER BY created_at DESC'
    ).all();
    return json(results);
  }

  // POST / DELETE: 需要认证
  const auth = await requireAuth(request, env);
  if (!auth) return json({ error: '未授权' }, 401);

  if (method === 'POST') {
    const body = await request.json();
    const urlErr = urlValidator(body.url, '图片链接');
    if (urlErr) return json({ error: urlErr }, 400);
    const caption = (body.caption || '').trim().slice(0, 500);
    const result = await db.prepare(
      'INSERT INTO photos (url, caption) VALUES (?, ?)'
    ).bind(body.url.trim(), caption).run();
    return json({ success: true, id: result.meta.last_row_id });
  }

  if (method === 'DELETE') {
    const id = extractId(path);
    if (!id) return json({ error: '无效的 ID' }, 400);
    await db.prepare('DELETE FROM photos WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

// ── 视频 CRUD ────────────────────────────────────────────
async function handleVideos(request, env, path, method) {
  const db = env.DB;

  // GET: 公开读取
  if (method === 'GET') {
    const { results } = await db.prepare(
      'SELECT * FROM videos ORDER BY created_at DESC'
    ).all();
    return json(results);
  }

  // POST / DELETE: 需要认证
  const auth = await requireAuth(request, env);
  if (!auth) return json({ error: '未授权' }, 401);

  if (method === 'POST') {
    const body = await request.json();
    const titleErr = str(body.title, '标题', { max: 200 });
    const urlErr = urlValidator(body.url, '视频链接');
    if (titleErr || urlErr) return json({ error: titleErr || urlErr }, 400);
    const description = (body.description || '').trim().slice(0, 1000);
    const result = await db.prepare(
      'INSERT INTO videos (title, description, url) VALUES (?, ?, ?)'
    ).bind(body.title.trim(), description, body.url.trim()).run();
    return json({ success: true, id: result.meta.last_row_id });
  }

  if (method === 'DELETE') {
    const id = extractId(path);
    if (!id) return json({ error: '无效的 ID' }, 400);
    await db.prepare('DELETE FROM videos WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}
