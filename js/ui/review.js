/* 回顾页：日历热力图 + 洞察 + 那年今日 */

import { el } from '../utils/dom.js';
import {
  daysInMonth, firstWeekday, monthTitle, dateKey, todayKey, dayLabel, fmtMD,
} from '../utils/date.js';
import {
  S, entriesOfDate, monthStats, stateRanking, tagIndex, entriesByDay, lessonEntries,
} from '../store.js';
import { entryCard } from './cards.js';
import { openSheet, emptyState } from './components.js';

const now = new Date();
let viewY = now.getFullYear();
let viewM = now.getMonth();

export function render() {
  const frag = el('div');

  frag.append(
    el('div.big-head', {},
      el('h1', { text: '回顾' }),
      el('div.sub', { text: '记录多了以后，这里会告诉你一些事' })
    )
  );

  // ---------- 当月概览 ----------
  const ms = monthStats(viewY, viewM);
  frag.append(
    el('div.section', {},
      el('div.stat-row', {},
        stat(ms.count, '记录'),
        stat(ms.postmortems, '复盘'),
        stat(ms.lessons, '经验')
      )
    )
  );

  // ---------- 日历 ----------
  frag.append(calendarCard());

  // ---------- 洞察 ----------
  const ranking = stateRanking().slice(0, 5);
  if (ranking.length) {
    frag.append(
      el('div.section', {},
        el('div.section-title', { text: '我在什么状态下最容易吃亏' }),
        el('div.card.card-pad', {}, bars(ranking.map((r) => ({ name: r.name, count: r.count })), 'var(--orange)'))
      )
    );
  }

  const tags = Array.from(tagIndex().values()).sort((a, b) => b.count - a.count).slice(0, 5);
  if (tags.length) {
    frag.append(
      el('div.section', {},
        el('div.section-title', { text: '踩坑最多的场景' }),
        el('div.card.card-pad', {}, bars(tags.map((t) => ({ name: '#' + t.name, count: t.count }))))
      )
    );
  }

  // ---------- 那年今日 ----------
  frag.append(memoryCard());

  if (!S.entries.length) {
    frag.append(emptyState('📅', '还没有记录，日历会是空的'));
  }

  return frag;
}

/* ---------------- 子组件 ---------------- */

function stat(num, lab) {
  return el('div.stat', {}, el('span.num', { text: String(num) }), el('span.lab', { text: lab }));
}

function bars(items, color = 'var(--blue)') {
  const max = Math.max(1, ...items.map((i) => i.count));
  const wrap = el('div.bars');
  for (const it of items) {
    wrap.append(
      el('div.bar-item', {},
        el('div.bar-top', {},
          el('span.name', { text: it.name }),
          el('span.val', { text: String(it.count) })
        ),
        el('div.bar-track', {},
          el('div.bar-fill', {
            style: { width: Math.max(4, (it.count / max) * 100) + '%', background: color },
          })
        )
      )
    );
  }
  return wrap;
}

function calendarCard() {
  const card = el('div.card', { style: { padding: '14px 14px 12px' } });

  const head = el('div.cal-head', {},
    el('div.cal-month', { text: monthTitle(viewY, viewM) }),
    el('div.cal-nav', {},
      el('button', {
        text: '‹',
        onclick: () => {
          viewM -= 1;
          if (viewM < 0) { viewM = 11; viewY -= 1; }
          rerenderCalendar();
        },
      }),
      el('button', {
        text: '›',
        onclick: () => {
          viewM += 1;
          if (viewM > 11) { viewM = 0; viewY += 1; }
          rerenderCalendar();
        },
      })
    )
  );
  card.append(head);

  const grid = el('div.cal-grid');
  for (const w of ['日', '一', '二', '三', '四', '五', '六']) {
    grid.append(el('div.cal-wd', { text: w }));
  }

  const total = daysInMonth(viewY, viewM);
  const lead = firstWeekday(viewY, viewM);
  for (let i = 0; i < lead; i += 1) grid.append(el('div'));

  const tk = todayKey();
  for (let d = 1; d <= total; d += 1) {
    const key = dateKey(new Date(viewY, viewM, d));
    const n = entriesOfDate(key).length;
    const future = key > tk;
    let cls = 'cal-cell';
    if (n > 0) cls += ` l${Math.min(4, n)}`;
    else if (!future) cls += ' l0';
    if (key === tk) cls += ' today';
    const cellEl = el('button.' + cls.split(' ').join('.'), {
      text: String(d),
      onclick: () => openDay(key),
    });
    grid.append(cellEl);
  }

  card.append(grid);

  // 图例
  const legend = el('div.cal-legend', {}, el('span', { text: '少' }));
  for (const c of ['l0', 'l1', 'l2', 'l3', 'l4']) {
    legend.append(el('i.' + c, { style: { background: legendColor(c) } }));
  }
  legend.append(el('span', { text: '多' }));
  card.append(legend);

  return el('div.section', {}, card);
}

function legendColor(c) {
  switch (c) {
    case 'l0': return 'var(--fill-2)';
    case 'l1': return 'rgba(0,122,255,0.22)';
    case 'l2': return 'rgba(0,122,255,0.45)';
    case 'l3': return 'rgba(0,122,255,0.72)';
    default: return 'rgba(0,122,255,1)';
  }
}

function rerenderCalendar() {
  const page = document.getElementById('page-review');
  if (!page) return;
  const scroll = page.scrollTop;
  page.querySelector('.page-inner').replaceChildren(render());
  page.scrollTop = scroll;
}

function openDay(key) {
  const list = entriesOfDate(key);
  const body = el('div', { style: { padding: '0 0 20px' } });
  if (!list.length) {
    body.append(emptyState('·', '这天没有记录'));
  } else {
    const wrap = el('div.day-list', { style: { margin: '0 16px' } });
    for (const e of list) wrap.append(entryCard(e));
    body.append(wrap);
  }
  openSheet({
    title: `${dayLabel(key)} · ${list.length} 条`,
    left: { label: '关闭' },
    body,
  });
}

function memoryCard() {
  const tk = todayKey();
  const md = tk.slice(5); // MM-DD
  const yearsAgo = S.entries
    .filter((e) => e.date.slice(5) === md && e.date.slice(0, 4) !== tk.slice(0, 4))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  let pick = null;
  let label = '';

  if (yearsAgo.length) {
    pick = yearsAgo[0];
    label = '那年今日';
  } else if (S.entries.length > 3) {
    // 随机回顾：只从 7 天以前的记录里抽
    const old = S.entries.filter((e) => e.date < dateKey(new Date(Date.now() - 7 * 86400000)));
    if (old.length) {
      pick = old[Math.floor(Math.random() * old.length)];
      label = '随机回顾';
    }
  }

  if (!pick) {
    return el('div');
  }

  const card = el('div.card.card-pad');
  card.append(
    el('div.entry-meta', { style: { marginBottom: '8px' } },
      el('span', { text: label }),
      el('span', { text: pick.date })
    ),
    el('div', {
      style: { fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-wrap' },
      text: (pick.lesson || pick.content || '').slice(0, 180),
    })
  );

  return el('div.section', {},
    el('div.section-title', { text: '翻回去看看' }),
    card
  );
}