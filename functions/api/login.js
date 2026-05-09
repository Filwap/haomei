/**
 * POST /api/login - 管理员登录
 */
const ADMIN_USER = 'admin';
const ADMIN_PASS = '010403';
const JWT_SECRET = 'haomei_secret_2025';

export async function onRequestPost(context) {
  const { request } = context;
  try {
    const body = await request.json();
    if (body.username === ADMIN_USER && body.password === ADMIN_PASS) {
      const payload = { user: ADMIN_USER, exp: Date.now() + 24 * 3600 * 1000 };
      const token = btoa(JSON.stringify(payload)) + '.' + await sign(JSON.stringify(payload));
      return json({ success: true, token });
    }
    return json({ success: false, error: '账号或密码错误' }, 401);
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

async function sign(data) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
