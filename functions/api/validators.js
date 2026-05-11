/**
 * 输入校验器
 */

const MAX_STR_LEN = 2000;

/**
 * 通用字符串校验
 */
export function str(val, name, opts = {}) {
  const { required = true, max = MAX_STR_LEN, min = 0 } = opts;
  if (val === undefined || val === null) {
    if (required) return `缺少 ${name || '字段'}`;
    return null;
  }
  const s = String(val).trim();
  if (!s && required) return `${name || '字段'}不能为空`;
  if (s.length < min) return `${name} 至少需要 ${min} 个字符`;
  if (s.length > max) return `${name} 不能超过 ${max} 个字符`;
  return null;
}

/**
 * URL 格式校验
 */
export function url(val, name) {
  const err = str(val, name);
  if (err) return err;
  try {
    const u = new URL(String(val).trim());
    if (!['http:', 'https:'].includes(u.protocol)) return 'URL 必须以 http:// 或 https:// 开头';
    return null;
  } catch {
    return '无效的 URL 格式';
  }
}

/**
 * 日期格式校验（YYYY-MM-DD 或 YYYY/MM/DD）
 */
export function dateStr(val, name) {
  const err = str(val, name, { min: 6, max: 20 });
  if (err) return err;
  const s = String(val).replace(/\//g, '-');
  // 尝试解析日期
  const d = new Date(s + 'T00:00:00');
  if (isNaN(d.getTime())) return '无效的日期格式，请使用 YYYY-MM-DD';
  return null;
}

/**
 * 批量校验 — 返回第一个错误，或 null（全部通过）
 */
export function validate(rules) {
  for (const [value, validator, name, options] of rules) {
    const err = validator(value, name, options);
    if (err) return err;
  }
  return null;
}
