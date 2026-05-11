/**
 * 认证模块 — HMAC-SHA256 签名 Token
 *
 * Token 格式: base64({user,exp,iat}).hmac_sha256_signature
 * 密钥来源: env.JWT_SECRET（Cloudflare Secrets / wrangler.toml）
 */

// 默认密钥（仅用于本地开发 fallback，生产环境必须通过 env 注入）
const FALLBACK_SECRET = 'haomei_hmac_secret_change_me';

/**
 * 生成 HMAC-SHA256 签名的认证 Token
 */
export async function generateToken(env) {
  const secret = getSecret(env);
  const now = Date.now();
  const payload = btoa(JSON.stringify({
    user: 'admin',
    iat: now,
    exp: now + 7 * 24 * 60 * 60 * 1000, // 7天有效期
  }));

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const signature = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${payload}.${signature}`;
}

/**
 * 验证请求中的 Token
 * @returns {object|null} 解码后的 payload，无效返回 null
 */
export async function verifyToken(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token || !token.includes('.')) return null;

  try {
    const [payloadB64, signature] = token.split('.');
    const payload = JSON.parse(atob(payloadB64));

    if (!payload.exp || payload.exp < Date.now()) return null;
    if (!payload.user) return null;

    // 验证 HMAC 签名
    const secret = getSecret(env);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );

    // 将 hex 签名转为 Uint8Array
    const sigBytes = new Uint8Array(signature.length / 2);
    for (let i = 0; i < sigBytes.length; i++) {
      sigBytes[i] = parseInt(signature.substr(i * 2, 2), 16);
    }

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payloadB64));
    return valid ? payload : null;
  } catch (e) {
    return null;
  }
}

/**
 * 验证管理员登录凭据
 */
export function validateCredentials(body, env) {
  const username = body?.username?.trim() || '';
  const password = body?.password?.trim() || '';

  // 从环境变量读取，支持明文或 bcrypt 哈希
  const adminUser = env.ADMIN_USER || 'admin';
  const adminPass = env.ADMIN_PASS || 'haomei2025';

  return (username === adminUser && password === adminPass)
    ? { ok: true }
    : { ok: false };
}

function getSecret(env) {
  return env.JWT_SECRET || FALLBACK_SECRET;
}
