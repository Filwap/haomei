/**
 * 全局中间件
 * 统一处理: CORS 预检、请求日志、错误兜底
 */

export async function onRequest(context) {
  const { request, next } = context;
  const method = request.method;

  // CORS 预检请求 — 直接响应
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  // 继续执行下游 handler（[[path]].js）
  return await next();
}

// ── CORS Headers ────────────────────────────────────────
const ALLOWED_ORIGIN = typeof ALLOWED_ORIGIN !== 'undefined'
  ? ALLOWED_ORIGIN
  : '*';

export function corsHeaders(origin) {
  const allow = origin && origin.endsWith('haomei.cn.mt')
    ? origin
    : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}
