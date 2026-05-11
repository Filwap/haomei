/**
 * Haomei — Cloudflare Worker (Standalone)
 * 
 * 统一入口: 处理所有 /api/* 请求 + 静态资源服务
 * 数据库: Cloudflare D1 (binding: DB)
 * 认证:   HMAC-SHA256 signed token
 */

import { generateToken, verifyToken, validateCredentials } from './functions/api/auth.js';
import { ensureDB, extractId } from './functions/api/db.js';
import { str, url as urlValidator, dateStr } from './functions/api/validators.js';
import { checkRateLimit } from './functions/api/rate-limit.js';

// ── CORS ──────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ── 响应工具 ──────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── 认证中间件 ────────────────────────────────────────────
async function requireAuth(request, env) {
  return await verifyToken(request, env);
}

// ══════════════════════════════════════════════════════════
//  主入口
// ══════════════════════════════════════════════════════════

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // CORS 预检
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ── API 路由 ─────────────────────────────────────────
    if (pathname.startsWith('/api/')) {
      try {
        await ensureDB(env.DB);
        return await routeAPI(pathname, method, request, env);
      } catch (e) {
        console.error('[API Error]', e.message);
        return json({ error: 'Internal server error' }, 500);
      }
    }

    // ── 静态资源（HTML/JS/CSS/图片/音乐等）──────────────
    // Workers Assets 绑定自动处理静态文件
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    // 无 ASSETS 绑定时返回 404
    return new Response('Not found', { status: 404 });
  },
};

// ══════════════════════════════════════════════════════════
//  API 路由分发
// ══════════════════════════════════════════════════════════

async function routeAPI(pathname, method, request, env) {

  // ── 登录 ─────────────────────────────────────────────
  if (pathname === '/api/login' && method === 'POST') {
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
      expires: 7 * 24 * 60 * 60,
    });
  }

  // ── 纪念日 ───────────────────────────────────────────
  if (pathname.startsWith('/api/anniversaries')) {
    return handleAnniversaries(request, env, pathname, method);
  }

  // ── 留言板 ───────────────────────────────────────────
  if (pathname.startsWith('/api/messages')) {
    return handleMessages(request, env, pathname, method);
  }

  // ── 照片 ─────────────────────────────────────────────
  if (pathname.startsWith('/api/photos')) {
    return handlePhotos(request, env, pathname, method);
  }

  // ── 视频 ─────────────────────────────────────────────
  if (pathname.startsWith('/api/videos')) {
    return handleVideos(request, env, pathname, method);
  }

  return json({ error: 'Not found' }, 404);
}

// ══════════════════════════════════════════════════════════
//  端点处理函数
// ══════════════════════════════════════════════════════════

async function handleAnniversaries(request, env, path, method) {
  const db = env.DB;

  if (method === 'GET') {
    const { results } = await db.prepare('SELECT * FROM anniversaries ORDER BY date ASC').all();
    return json(results);
  }

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

async function handleMessages(request, env, path, method) {
  const db = env.DB;

  if (method === 'GET') {
    const { results } = await db.prepare(
      'SELECT * FROM messages ORDER BY created_at DESC'
    ).all();
    return json(results);
  }

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

async function handlePhotos(request, env, path, method) {
  const db = env.DB;

  if (method === 'GET') {
    const { results } = await db.prepare(
      'SELECT * FROM photos ORDER BY created_at DESC'
    ).all();
    return json(results);
  }

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

async function handleVideos(request, env, path, method) {
  const db = env.DB;

  if (method === 'GET') {
    const { results } = await db.prepare(
      'SELECT * FROM videos ORDER BY created_at DESC'
    ).all();
    return json(results);
  }

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
