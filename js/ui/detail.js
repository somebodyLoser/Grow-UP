/* 记录详情弹层 */

import { el } from '../utils/dom.js';
import { dayLabel, hm, fmtYMD, parseKey } from '../utils/date.js';
import { getEntry, deleteEntry, categoryById, hasLesson, entriesWithState } from '../store.js';
import { openSheet, toast, actionSheet, confirmAction } from './components.js';
import { openEditor } from './editor.js';

export function notifyChanged() {
  document.dispatchEvent(new CustomEvent('data-changed'));
}

export function openDetail(entryId) {
  const e = getEntry(entryId);
  if (!e) return null;

  const cat = categoryById(e.categoryId);

  const titlebar = el('div.detail-titlebar');
  const meta = el('div.detail-meta');
  if (cat) {
    meta.append(el('span.entry-cat', {}, el('span', { text: cat.icon }), el('span', { text: cat.name })));
  }
  meta.append(el('span', { text: `${dayLabel(e.date)} · ${hm(e.createdAt)}` }));
  if (e.date !== new Date(e.createdAt).toISOString().slice(0, 10)) {
    meta.append(el('span', { text: `（事件日期 ${e.date}）` }));
  }

  const blocks = [];

  if (hasLesson(e)) {
    blocks.push(el('div.detail-block.lesson', {},
      el('div.lab', {}, el('span', { text: '⭐ 下次怎么做' })),
      el('div.val', { text: e.lesson })
    ));
  }
  if (e.cause) {
    blocks.push(el('div.detail-block', {},
      el('div.lab', {}, el('span', { text: '为什么会这样' })),
      el('div.val', { text: e.cause })
    ));
  }
  if (e.states.length) {
    const chips = el('div.chips');
    for (const s of e.states) {
      chips.append(el('button.chip', {
        text: s,
        onclick: () => {
          const list = entriesWithState(s);
          toast(`「${s}」出现在 ${list.length} 条记录里`);
        },
      }));
    }
    blocks.push(el('div.detail-block', {},
      el('div.lab', {}, el('span', { text: '当时的状态' })),
      chips
    ));
  }

  const tagRow = el('div.detail-tags');
  for (const t of e.tags) tagRow.append(el('span.chip.tag-chip', { text: '#' + t }));

  const body = el('div.detail-scroll', {},
    el('div.detail-head', {}, titlebar, meta),
    e.content ? el('div.detail-text.selectable', { text: e.content }) : null,
    ...blocks,
    e.tags.length ? tagRow : null,
    el('div.detail-head', { style: { paddingTop: '22px' } },
      el('button.btn.block.primary', {
        text: '编辑这条记录',
        onclick: () => {
          sheet.close();
          openEditor({ entryId: e.id });
        },
      })
    )
  );

  const sheet = openSheet({
    title: e.type === 'postmortem' ? '复盘' : '记录',
    left: {
      label: '更多',
      onClick: async () => {
        const act = await actionSheet({
          title: '这条记录',
          actions: [
            { label: '编辑', value: 'edit' },
            { label: '复制正文', value: 'copy' },
            { label: '删除', value: 'del', danger: true },
          ],
        });
        if (act === 'edit') {
          sheet.close();
          openEditor({ entryId: e.id });
        } else if (act === 'copy') {
          try {
            await navigator.clipboard.writeText(e.content || e.lesson || '');
            toast('已复制');
          } catch {
            toast('复制失败');
          }
        } else if (act === 'del') {
          const ok = await confirmAction('删除这条记录？', '删除后无法恢复');
          if (ok) {
            await deleteEntry(e.id);
            sheet.close();
            notifyChanged();
            toast('已删除');
          }
        }
        return false; // 不关闭详情
      },
    },
    right: { label: '关闭' },
    body,
  });

  return sheet;
}