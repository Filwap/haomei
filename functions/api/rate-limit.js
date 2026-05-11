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

/**
 * 清理过期的 bucket 条目（定期调用防止内存泄漏）
 */
export function cleanup() {
  const now = Date.now();
  for (const [ip, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(ip);
  }
}

// 每 5 分钟自动清理一次
setInterval(cleanup, 5 * 60_000);
