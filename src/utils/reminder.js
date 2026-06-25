/**
 * 提醒计算工具
 */

/** 返回本地时区的 YYYY-MM-DD 字符串，避免 UTC 时区偏移 */
export function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysUntil(targetDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  // 手动解析 "YYYY-MM-DD" 为本地时间，避免 new Date(isoString) 被当做 UTC 解析
  const parts = String(targetDate).slice(0, 10).split("-");
  const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2] || 1));
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
