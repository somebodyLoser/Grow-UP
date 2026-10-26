/* 经验库：所有「下次怎么做」的汇总，按标签筛选 */

import { el } from '../utils/dom.js';
import { lessonEntries, tagIndex } from '../store.js';
import { lessonCard } from './cards.js';
import { emptyState } from './components.js';
import { openEditor } from './editor.js';

let filterTag = null;

export function render() {
  const all = lessonEntries();
  const frag = el('div');

  frag.append(
    el('div.big-head', {},
      el('div.big-head-row', {},
        el('div', {},
          el('h1', { text: '经验库' }),
          el('div.sub', {
            text: all.length ? `共 ${all.length} 条经验` : '复盘里填了「下次怎么做」就会汇总到这里',
          })
        )
      )
    )
  );

  if (!all.length) {
    frag.append(emptyState('⭐', '还没有经验。\n在「今天」页点「做一次复盘」，把「下次怎么做」写一句，它就会出现在这里。'));
    frag.append(
      el('div', { style: { padding: '0 16px' } },
        el('button.btn.block.primary', {
          text: '现在写一条复盘',
          onclick: () => openEditor({ defaultMode: 'postmortem' }),
        })
      )
    );
    return frag;
  }

  // ---------- 标签筛选 ----------
  const idx = tagIndex();
  const tags = Array.from(idx.values())
    .filter((t) => t.lessons > 0)
    .sort((a, b) => b.lessons - a.lessons || b.count - a.count)
    .slice(0, 12);

  if (tags.length) {
    const row = el('div.chips.scroll', { style: { marginBottom: '16px' } });
    row.append(
      el('button.chip' + (filterTag === null ? '.active' : ''), {
        text: '全部',
        onclick: () => { filterTag = null; rerender(); },
      })
    );
    for (const t of tags) {
      row.append(el('button.chip' + (filterTag === t.name ? '.active' : ''), {
        text: `#${t.name} ${t.lessons}`,
        onclick: () => { filterTag = filterTag === t.name ? null : t.name; rerender(); },
      }));
    }
    frag.append(el('div', { style: { padding: '0 16px' } }, row));
  }

  // ---------- 列表 ----------
  const list = filterTag ? all.filter((e) => e.tags.includes(filterTag)) : all;
  list.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : (a.date < b.date ? 1 : -1)));

  const wrap = el('div.day-list', { style: { margin: '0 16px' } });
  for (const e of list) wrap.append(lessonCard(e));
  frag.append(wrap);

  if (!list.length) {
    frag.append(emptyState('🔍', '这个标签下还没有经验'));
  }

  return frag;
}

/* 就地重绘（避免整页闪烁和滚动跳变） */
function rerender() {
  const page = document.getElementById('page-lessons');
  if (!page) return;
  const inner = page.querySelector('.page-inner');
  const scroll = page.scrollTop;
  inner.replaceChildren(render());
  page.scrollTop = scroll;
}