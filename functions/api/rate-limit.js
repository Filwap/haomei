/**
 * 简易 IP 速率限制（基于内存 Map）
 *
 * Cloudflare Pages Functions 是无状态的，每个请求可能在不同的 isolate 中执行，
 * 因此这个限流器在低流量下有效（同一 edge 节点的连续请求）。
 * 对于生产级限流，应使用 Cloudflare Rate Limiting API 或 KV 存储。
 */

const buckets = new Map();

/**
 * 检查是否允许通过
 * @param {string} ip - 客户端 IP
 * @param {object} opts - 配置: { windowMs=60000, maxRequests=10 }
 * @returns {{ ok: boolean, retryAfter?: number }}
 */
export function checkRateLimit(ip, opts = {}) {
  const { windowMs = 60_000, maxRequests = 10 } = opts;
  const now = Date.now();

  // 概率性清理过期条目（替代 setInterval，避免全局异步操作）
  if (Math.random() < 0.01) {
    for (const [key, entry] of buckets) {
      if (now > entry.resetAt) buckets.delete(key);
    }
  }

  const entry = buckets.get(ip);

  if (!entry || now > entry.resetAt) {
    // 新窗口或已过期 — 重置计数器
    buckets.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { ok: false, retryAfter };
  }

  entry.count++;
  return { ok: true };
}

// 注意: 不再使用 setInterval 自动清理（Workers 全局作用域不允许异步操作）
// 清理由调用方在请求处理中按需触发，或依赖 Map 自然生命周期
export function cleanup() {
