/* 今天页：时间流 + 快捷记录入口 */

import { el } from '../utils/dom.js';
import { weekdayLong, fmtMD } from '../utils/date.js';
import { S, entriesByDay, streak, stats } from '../store.js';
import { dayGroup } from './cards.js';
import { emptyState } from './components.js';
import { openEditor } from './editor.js';

export function render() {
  const frag = el('div');

  const now = new Date();
  const days = streak();
  const all = stats();

  // ---------- 页头 ----------
  frag.append(
    el('div.big-head', {},
      el('div.big-head-row', {},
        el('div', {},
          el('h1', { text: '今天' }),
          el('div.sub', { text: `${fmtMD(now)} ${weekdayLong(now)}` })
        ),
        days > 0
          ? el('div.streak', { text: `🔥 连续 ${days} 天` })
          : null
      )
    )
  );

  // ---------- 记录入口 ----------
  const compose = el('div.compose-card', {},
    el('button.compose-main', {
      onclick: () => openEditor({ defaultMode: 'note' }),
    },
      el('div.compose-pen', {},
        (() => {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 24 24');
          svg.setAttribute('fill', 'none');
          svg.setAttribute('stroke', 'currentColor');
          svg.setAttribute('stroke-width', '1.8');
          svg.setAttribute('stroke-linecap', 'round');
          svg.setAttribute('stroke-linejoin', 'round');
          const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          p.setAttribute('d', 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z');
          svg.append(p);
          return svg;
        })()
      ),
      el('div', {},
        el('div.compose-placeholder', { text: '此刻在想什么？' }),
        el('div.compose-sub', { text: '点子、感想、吐槽，随手记一条' })
      )
    ),
    el('div.compose-divider'),
    el('button.compose-sub-row', {
      onclick: () => openEditor({ defaultMode: 'postmortem' }),
    },
      el('span.star', { text: '⭐' }),
      el('span', { text: '做一次复盘' }),
      el('span.arrow', { text: '›' })
    )
  );
  frag.append(compose);

  // ---------- 时间流 ----------
  if (!S.entries.length) {
    frag.append(
      emptyState('📝', '还没有记录。\n写第一条吧，哪怕只是一句"今天有点累"。')
    );
    return frag;
  }

  const groups = entriesByDay();
  const today = groups[0];

  // 最近的记录最多展示 200 条，避免一次渲染太多
  let shown = 0;
  for (const { key, list } of groups) {
    if (shown >= 200) break;
    frag.append(dayGroup(key, list.slice(0, 200 - shown)));
    shown += list.length;
  }

  if (all.total > 200) {
    frag.append(
      el('div', {
        style: { textAlign: 'center', fontSize: '13px', color: 'var(--label-3)', padding: '0 0 8px' },
        text: `更早的记录请到「回顾」里按日历查看（共 ${all.total} 条）`,
      })
    );
  }

  return frag;
}