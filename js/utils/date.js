/* 日期工具：全部使用本地时区，避免 toISOString 的 UTC 偏移问题 */

const pad = (n) => String(n).padStart(2, '0');
const WD_LONG = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const WD_SHORT = '日一二三四五六';

/** Date → "2025-10-12" */
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2025-10-12" → Date（本地零点） */
export function parseKey(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayKey() {
  return dateKey(new Date());
}

export function weekdayLong(d) {
  return WD_LONG[d.getDay()];
}

export function weekdayShort(d) {
  return '周' + WD_SHORT[d.getDay()];
}

/** 10月12日 */
export function fmtMD(d) {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 2025年10月12日 */
export function fmtYMD(d) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 16:40 */
export function hm(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 时间流域分组标题：今天 / 昨天 / 前天 / 10月12日 周六（跨年时带年份） */
export function dayLabel(key) {
  const d = parseKey(key);
  const now = new Date();
  const diff = Math.round(
    (parseKey(todayKey()).getTime() - parseKey(key).getTime()) / 86400000
  );
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff === 2) return '前天';
  const sameYear = d.getFullYear() === now.getFullYear();
  return sameYear
    ? `${fmtMD(d)} ${weekdayShort(d)}`
    : `${d.getFullYear()}年${fmtMD(d)} ${weekdayShort(d)}`;
}

export function monthKey(y, m) {
  return `${y}-${pad(m + 1)}`;
}

export function monthTitle(y, m) {
  return `${y}年${m + 1}月`;
}

export function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

/** 该月 1 号是星期几（0=周日） */
export function firstWeekday(y, m) {
  return new Date(y, m, 1).getDay();
}

/** 相对时间，用于"上次备份"之类 */
export function sinceLabel(ts) {
  if (!ts) return '从未';
  const diff = Date.now() - ts;
  const day = Math.floor(diff / 86400000);
  if (day <= 0) {
    const h = Math.floor(diff / 3600000);
    if (h <= 0) {
      const m = Math.max(1, Math.floor(diff / 60000));
      return `${m} 分钟前`;
    }
    return `${h} 小时前`;
  }
  if (day === 1) return '昨天';
  if (day < 30) return `${day} 天前`;
  const d = new Date(ts);
  return fmtYMD(d);
}