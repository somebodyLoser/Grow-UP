/* 数据层：内存缓存 + IndexedDB 持久化
 * 记录量级（个人使用，几千条以内）完全可以直接全量载入内存，
 * 筛选/统计都在内存里做，交互零延迟。
 */

import { idbAll, idbGet, idbPut, idbDel, idbClear, idbPutAll } from './db.js';
import { dateKey, todayKey, parseKey } from './utils/date.js';

export const S = {
  entries: [],
  categories: [],
  states: [],
  ready: false,
};

const DEFAULT_CATEGORIES = [
  { icon: '💰', name: '消费', color: '#FF9500' },
  { icon: '🏥', name: '健康就医', color: '#FF3B30' },
  { icon: '💼', name: '工作', color: '#007AFF' },
  { icon: '🤝', name: '人际沟通', color: '#34C759' },
  { icon: '🏠', name: '生活杂事', color: '#8E8E93' },
  { icon: '💡', name: '想法感悟', color: '#FFCC00' },
];

const DEFAULT_STATES = [
  '⏱ 赶时间',
  '😳 不好意思拒绝',
  '❓ 不懂行',
  '💸 图便宜',
  '😤 情绪上头',
  '😪 太累了',
  '📄 没看条款',
  '👥 被催促',
];

export function uid() {
  if (globalThis.crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function sortEntries(list) {
  return list.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

/* =================== 初始化 =================== */

export async function init() {
  const seeded = await idbGet('meta', 'seeded');

  S.categories = (await idbAll('categories')).sort((a, b) => (a.order || 0) - (b.order || 0));
  S.states = (await idbAll('states')).sort((a, b) => (a.order || 0) - (b.order || 0));
  S.entries = sortEntries(await idbAll('entries'));

  if (!seeded) {
    let i = 0;
    for (const c of DEFAULT_CATEGORIES) {
      await addCategory(c);
      i += 1;
    }
    for (const name of DEFAULT_STATES) await addState(name);
    await idbPut('meta', { key: 'seeded', value: true });
  }

  S.ready = true;
  return S;
}

/* =================== 记录 =================== */

export function normalizeEntry(raw) {
  return {
    id: raw.id || uid(),
    createdAt: raw.createdAt || Date.now(),
    updatedAt: raw.updatedAt || Date.now(),
    date: raw.date || todayKey(),
    type: raw.type === 'postmortem' ? 'postmortem' : 'note',
    content: String(raw.content || ''),
    categoryId: raw.categoryId || null,
    tags: Array.isArray(raw.tags) ? [...new Set(raw.tags.map((t) => String(t).trim()).filter(Boolean))] : [],
    states: Array.isArray(raw.states) ? [...new Set(raw.states.map(String))] : [],
    cause: String(raw.cause || ''),
    lesson: String(raw.lesson || ''),
  };
}

export async function saveEntry(patch) {
  const now = Date.now();
  const existing = patch.id ? S.entries.find((e) => e.id === patch.id) : null;

  let entry;
  if (existing) {
    entry = normalizeEntry({ ...existing, ...patch, updatedAt: now });
  } else {
    entry = normalizeEntry({ ...patch, createdAt: now, updatedAt: now });
  }
  if (entry.type !== 'postmortem') {
    entry.states = [];
    entry.cause = '';
    entry.lesson = '';
  }

  await idbPut('entries', entry);

  if (existing) {
    const idx = S.entries.indexOf(existing);
    if (idx >= 0) S.entries[idx] = entry;
  } else {
    S.entries.push(entry);
  }
  sortEntries(S.entries);
  return entry;
}

export async function deleteEntry(id) {
  await idbDel('entries', id);
  const idx = S.entries.findIndex((e) => e.id === id);
  if (idx >= 0) S.entries.splice(idx, 1);
}

export const getEntry = (id) => S.entries.find((e) => e.id === id) || null;

export function entriesByDay(entries = S.entries) {
  const map = new Map();
  for (const e of entries) {
    if (!map.has(e.date)) map.set(e.date, []);
    map.get(e.date).push(e);
  }
  return Array.from(map.entries()).map(([key, list]) => ({ key, list }));
}

export function entriesOfDate(key) {
  return S.entries.filter((e) => e.date === key);
}

export function hasLesson(e) {
  return e.type === 'postmortem' && String(e.lesson || '').trim().length > 0;
}

export function lessonEntries() {
  return S.entries.filter(hasLesson);
}

/* 连续记录天数 */
export function streak() {
  const days = new Set(S.entries.map((e) => e.date));
  if (!days.size) return 0;
  const cursor = parseKey(todayKey());
  let count = 0;
  // 今天没写但昨天写了，连续天数仍然算延续中
  if (!days.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dateKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/* =================== 标签（从记录里派生，不单独建表） =================== */

export function tagIndex() {
  const map = new Map();
  for (const e of S.entries) {
    for (const t of e.tags) {
      const cur = map.get(t) || { name: t, count: 0, last: 0, lessons: 0 };
      cur.count += 1;
      cur.last = Math.max(cur.last, e.updatedAt || e.createdAt || 0);
      if (hasLesson(e)) cur.lessons += 1;
      map.set(t, cur);
    }
  }
  return map;
}

export function allTags() {
  return Array.from(tagIndex().values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function recentTags(n = 8) {
  return Array.from(tagIndex().values())
    .sort((a, b) => b.last - a.last || b.count - a.count)
    .slice(0, n)
    .map((t) => t.name);
}

export async function renameTag(oldName, newName) {
  const target = String(newName || '').trim();
  if (!target || target === oldName) return 0;
  let touched = 0;
  for (const e of S.entries) {
    if (!e.tags.includes(oldName)) continue;
    e.tags = [...new Set(e.tags.map((t) => (t === oldName ? target : t)))];
    e.updatedAt = Date.now();
    await idbPut('entries', e);
    touched += 1;
  }
  return touched;
}

export async function deleteTag(name) {
  let touched = 0;
  for (const e of S.entries) {
    if (!e.tags.includes(name)) continue;
    e.tags = e.tags.filter((t) => t !== name);
    e.updatedAt = Date.now();
    await idbPut('entries', e);
    touched += 1;
  }
  return touched;
}

/* =================== 分类 =================== */

export async function addCategory({ name, icon = '📁', color = '#8E8E93' }) {
  const cat = {
    id: uid(),
    name: String(name || '未命名').trim() || '未命名',
    icon,
    color,
    order: (S.categories.at(-1)?.order || 0) + 1,
  };
  await idbPut('categories', cat);
  S.categories.push(cat);
  return cat;
}

export async function updateCategory(id, patch) {
  const cat = S.categories.find((c) => c.id === id);
  if (!cat) return null;
  Object.assign(cat, patch);
  await idbPut('categories', cat);
  return cat;
}

export async function deleteCategory(id) {
  await idbDel('categories', id);
  const idx = S.categories.findIndex((c) => c.id === id);
  if (idx >= 0) S.categories.splice(idx, 1);
  // 相关记录归为"无分类"，不删记录
  let touched = 0;
  for (const e of S.entries) {
    if (e.categoryId !== id) continue;
    e.categoryId = null;
    e.updatedAt = Date.now();
    await idbPut('entries', e);
    touched += 1;
  }
  return touched;
}

export const categoryById = (id) => S.categories.find((c) => c.id === id) || null;

export function categoryCount(id) {
  return S.entries.filter((e) => e.categoryId === id).length;
}

/* =================== 状态词 =================== */

export async function addState(name) {
  const text = String(name || '').trim();
  if (!text) return null;
  if (S.states.some((s) => s.name === text)) return null;
  const st = { id: uid(), name: text, order: (S.states.at(-1)?.order || 0) + 1 };
  await idbPut('states', st);
  S.states.push(st);
  return st;
}

export async function renameState(id, newName) {
  const st = S.states.find((s) => s.id === id);
  if (!st) return 0;
  const from = st.name;
  const to = String(newName || '').trim();
  if (!to || to === from) return 0;
  st.name = to;
  await idbPut('states', st);

  let touched = 0;
  for (const e of S.entries) {
    if (!e.states.includes(from)) continue;
    e.states = [...new Set(e.states.map((s) => (s === from ? to : s)))];
    e.updatedAt = Date.now();
    await idbPut('entries', e);
    touched += 1;
  }
  return touched;
}

/** 删除状态词：只从可选列表移除，历史记录里的原话保留 */
export async function deleteState(id) {
  await idbDel('states', id);
  const idx = S.states.findIndex((s) => s.id === id);
  if (idx >= 0) S.states.splice(idx, 1);
}

export function stateUsage(name) {
  return S.entries.filter((e) => e.states.includes(name)).length;
}

/** 状态词频次排行（洞察用） */
export function stateRanking() {
  const map = new Map();
  for (const e of S.entries) {
    for (const s of e.states) map.set(s, (map.get(s) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function entriesWithState(name) {
  return S.entries.filter((e) => e.states.includes(name));
}

/* =================== 统计 =================== */

export function stats() {
  const total = S.entries.length;
  const postmortems = S.entries.filter((e) => e.type === 'postmortem').length;
  const lessons = lessonEntries().length;
  const chars = S.entries.reduce((n, e) => n + (e.content || '').replace(/\s/g, '').length, 0);
  return { total, postmortems, lessons, chars };
}

export function monthStats(y, m) {
  const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;
  const list = S.entries.filter((e) => e.date.startsWith(prefix));
  return {
    count: list.length,
    postmortems: list.filter((e) => e.type === 'postmortem').length,
    lessons: list.filter(hasLesson).length,
  };
}

/* =================== meta =================== */

export async function getMeta(key) {
  const row = await idbGet('meta', key);
  return row ? row.value : null;
}

export async function setMeta(key, value) {
  await idbPut('meta', { key, value });
}

/* =================== 备份 =================== */

export function exportData() {
  return {
    app: 'selflog',
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: S.categories,
    states: S.states,
    entries: S.entries,
  };
}

export function exportText() {
  const lines = [];
  lines.push(`# 自我记录备份  ${new Date().toLocaleString('zh-CN')}`);
  lines.push(`共 ${S.entries.length} 条记录\n`);
  for (const { key, list } of entriesByDay()) {
    lines.push(`\n## ${key}`);
    for (const e of list) {
      const cat = categoryById(e.categoryId);
      const head = [cat ? `${cat.icon} ${cat.name}` : '', e.type === 'postmortem' ? '复盘' : '']
        .filter(Boolean).join(' · ');
      lines.push(`\n### ${head}${head ? '  ' : ''}${e.tags.map((t) => '#' + t).join(' ')}`);
      if (e.content) lines.push(e.content);
      if (e.states.length) lines.push(`当时状态：${e.states.join('、')}`);
      if (e.cause) lines.push(`为什么会这样：${e.cause}`);
      if (e.lesson) lines.push(`⭐ 下次怎么做：${e.lesson}`);
    }
  }
  return lines.join('\n');
}

export async function importData(data, { merge = false } = {}) {
  if (!data || !Array.isArray(data.entries)) {
    throw new Error('文件格式不对：缺少 entries 数组');
  }
  const cats = (data.categories || []).map((c) => ({
    id: c.id || uid(),
    name: c.name || '未命名',
    icon: c.icon || '📁',
    color: c.color || '#8E8E93',
    order: c.order || 0,
  }));
  const sts = (data.states || []).map((s) => ({
    id: s.id || uid(),
    name: s.name || '',
    order: s.order || 0,
  })).filter((s) => s.name);

  const entries = data.entries.map((e) => normalizeEntry(e));

  if (merge) {
    const existCats = new Set(S.categories.map((c) => c.name));
    for (const c of cats) {
      if (!existCats.has(c.name)) await addCategory(c);
    }
    const existStates = new Set(S.states.map((s) => s.name));
    for (const s of sts) {
      if (!existStates.has(s.name)) await addState(s.name);
    }
    const existIds = new Set(S.entries.map((e) => e.id));
    const fresh = entries.filter((e) => !existIds.has(e.id));
    await idbPutAll('entries', fresh);
    S.entries.push(...fresh);
    sortEntries(S.entries);
    return fresh.length;
  }

  await idbClear('entries');
  await idbClear('categories');
  await idbClear('states');
  await idbPutAll('entries', entries);
  await idbPutAll('categories', cats);
  await idbPutAll('states', sts);
  S.entries = sortEntries(entries);
  S.categories = cats.sort((a, b) => a.order - b.order);
  S.states = sts.sort((a, b) => a.order - b.order);
  await setMeta('seeded', true);
  return entries.length;
}

export { todayKey, dateKey };