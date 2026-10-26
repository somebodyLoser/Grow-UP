/* 记录卡片 / 经验卡片（多个页面复用） */

import { el } from '../utils/dom.js';
import { dayLabel, hm, fmtMD, parseKey } from '../utils/date.js';
import { categoryById, hasLesson } from '../store.js';
import { openDetail } from './detail.js';

export function entryCard(e) {
  const cat = categoryById(e.categoryId);

  const meta = el('div.entry-meta', {}, el('span.time', { text: hm(e.createdAt) }));
  if (cat) {
    meta.append(el('span.entry-cat', {},
      el('span', { text: cat.icon }),
      el('span', { text: cat.name })
    ));
  }

  const kids = [meta];

  if (e.type === 'postmortem') {
    kids.push(el('span.entry-badge', { text: hasLesson(e) ? '⭐ 复盘' : '复盘' }));
  }

  if (e.content) {
    kids.push(el('div.entry-text', { text: e.content }));
  } else if (e.lesson) {
    kids.push(el('div.entry-text', { text: e.lesson }));
  }

  if (e.tags.length) {
    const tags = el('div.entry-tags');
    for (const t of e.tags) tags.append(el('span.chip.tag-chip', { text: '#' + t }));
    kids.push(tags);
  }

  return el('button.entry', { onclick: () => openDetail(e.id) }, ...kids);
}

export function lessonCard(e) {
  const cat = categoryById(e.categoryId);
  const meta = el('div.entry-meta');
  if (cat) {
    meta.append(el('span.entry-cat', {},
      el('span', { text: cat.icon }),
      el('span', { text: cat.name })
    ));
  }
  meta.append(el('span', { text: dayLabel(e.date) }));

  const kids = [meta, el('div.lesson-text', { text: e.lesson })];

  if (e.tags.length) {
    const tags = el('div.entry-tags');
    for (const t of e.tags) tags.append(el('span.chip.tag-chip', { text: '#' + t }));
    kids.push(tags);
  }

  return el('button.lesson-card', { onclick: () => openDetail(e.id) }, ...kids);
}

export function dayGroup(key, list) {
  const wrap = el('div.day-group');
  wrap.append(
    el('div.day-label', {},
      el('span', { text: dayLabel(key) }),
      el('span.count', { text: `${list.length} 条` })
    )
  );
  const listEl = el('div.day-list');
  for (const e of list) listEl.append(entryCard(e));
  wrap.append(listEl);
  return wrap;
}