/**
 * GET/POST/DELETE /api/videos - 视频 CRUD
 */

export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare('SELECT * FROM videos ORDER BY created_at DESC').all();
  return json(results);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!verifyToken(request)) return json({ error: '未授权' }, 401);
  const { title, description, url } = await request.json();
  if (!title || !url) return json({ error: '缺少参数' }, 400);
  const result = await env.DB.prepare('INSERT INTO videos (title, description, url) VALUES (?, ?, ?)').bind(title, description || '', url).run();
  return json({ success: true, id: result.meta.last_row_id });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!verifyToken(request)) return json({ error: '未授权' }, 401);
  const id = new URL(request.url).pathname.split('/').pop();
  await env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(id).run();
  return json({ success: true });
}

function verifyToken(request) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return false;
  try {
    const [payloadB64] = token.split('.');
    const payload = JSON.parse(atob(payloadB64));
    return payload.exp >= Date.now();
  } catch { return false; }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
