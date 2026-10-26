/* 编辑器：随手记 / 复盘 双模式 + 草稿自动保存 */

import { el } from '../utils/dom.js';
import { todayKey, dayLabel } from '../utils/date.js';
import {
  S, getEntry, saveEntry, recentTags, addState, categoryById, uid,
} from '../store.js';
import { openSheet, toast, actionSheet, promptSheet } from './components.js';

const DRAFT_KEY = 'selflog.draft.v1';

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || (!d.content && !d.lesson && !d.cause)) return null;
    return d;
  } catch {
    return null;
  }
}

function writeDraft(d) {
  try {
    if (!d.content && !d.lesson && !d.cause && !d.states?.length && !d.tags?.length) {
      localStorage.removeItem(DRAFT_KEY);
    } else {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    }
  } catch { /* 隐私模式下忽略 */ }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

/**
 * openEditor({ entryId, defaultMode, date, onSaved })
 */
export function openEditor(opts = {}) {
  const { entryId = null, defaultMode = 'note', date = null, onSaved = null } = opts;
  const editing = entryId ? getEntry(entryId) : null;

  const restored = editing ? null : readDraft();
  const st = {
    type: editing ? editing.type : (restored?.type || defaultMode),
    content: editing ? editing.content : (restored?.content || ''),
    cause: editing ? editing.cause : (restored?.cause || ''),
    lesson: editing ? editing.lesson : (restored?.lesson || ''),
    states: editing ? [...editing.states] : [...(restored?.states || [])],
    tags: editing ? [...editing.tags] : [...(restored?.tags || [])],
    categoryId: editing ? editing.categoryId : (restored?.categoryId || null),
    date: editing ? editing.date : (restored?.date || date || todayKey()),
  };

  let draftTimer = 0;
  const scheduleDraft = () => {
    if (editing) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => writeDraft(st), 600);
  };

  /* ---------- 顶部：模式 + 元信息 ---------- */

  const seg = el('div.seg');
  const segItems = [
    { key: 'note', label: '随手记' },
    { key: 'postmortem', label: '复盘' },
  ].map((it) => el('button.seg-item', {
    text: it.label,
    dataset: { key: it.key },
    onclick: () => {
      if (st.type === it.key) return;
      st.type = it.key;
      paintSeg();
      paintBlocks();
      scheduleDraft();
    },
  }));
  seg.append(...segItems);

  function paintSeg() {
    segItems.forEach((b) => b.classList.toggle('active', b.dataset.key === st.type));
  }

  const dateInput = el('input', { type: 'date', value: st.date });
  dateInput.addEventListener('change', () => {
    st.date = dateInput.value || todayKey();
    scheduleDraft();
  });

  const catPill = el('button.meta-pill');
  function paintCatPill() {
    const cat = categoryById(st.categoryId);
    catPill.replaceChildren(
      el('span', { text: cat ? cat.icon : '📁' }),
      el('span', { text: cat ? cat.name : '无分类' })
    );
  }
  catPill.addEventListener('click', async () => {
    const actions = S.categories.map((c) => ({
      label: `${c.icon}  ${c.name}`,
      value: c.id,
    }));
    actions.push({ label: '不分类', value: '__none__' });
    const pick = await actionSheet({
      title: '选择分类',
      actions,
    });
    if (pick === null) return;
    st.categoryId = pick === '__none__' ? null : pick;
    paintCatPill();
    scheduleDraft();
  });

  const metaRow = el('div.editor-metarow', {},
    el('div.meta-pill', {}, dateInput),
    catPill
  );

  const top = el('div.editor-top', {}, seg, metaRow);

  /* ---------- 正文 ---------- */

  const textEl = el('textarea#editorText', {
    placeholder: '发生了什么？当时的想法……',
  });
  textEl.value = st.content;
  const autoGrow = () => {
    textEl.style.height = 'auto';
    textEl.style.height = Math.max(130, textEl.scrollHeight) + 'px';
  };
  textEl.addEventListener('input', () => {
    st.content = textEl.value;
    autoGrow();
    scheduleDraft();
  });

  const contentWrap = el('div.editor-content', {}, textEl);

  /* ---------- 复盘专属区块 ---------- */

  const blocksWrap = el('div');

  function paintBlocks() {
    blocksWrap.replaceChildren();
    if (st.type !== 'postmortem') {
      blocksWrap.append(tagsBlock());
      return;
    }

    // 当时的状态
    const stateChips = el('div.chips');
    for (const s of S.states) {
      const active = st.states.includes(s.name);
      stateChips.append(el('button.chip' + (active ? '.active' : ''), {
        text: s.name,
        onclick: (ev) => {
          const btn = ev.currentTarget;
          const on = !st.states.includes(s.name);
          st.states = on
            ? [...st.states, s.name]
            : st.states.filter((x) => x !== s.name);
          btn.classList.toggle('active', on);
          scheduleDraft();
        },
      }));
    }
    stateChips.append(el('button.chip', {
      text: '＋ 新状态',
      onclick: async () => {
        const name = await promptSheet({
          title: '新增状态词',
          placeholder: '比如：懒得问清',
          confirmLabel: '添加',
        });
        if (!name) return;
        await addState(name);
        paintBlocks();
        scheduleDraft();
      },
    }));

    // 历史记录里出现过但已被删除的状态词，仍要能取消
    const orphans = st.states.filter((x) => !S.states.some((s) => s.name === x));
    for (const o of orphans) {
      stateChips.append(el('button.chip.active', {
        text: o,
        onclick: (ev) => {
          st.states = st.states.filter((x) => x !== o);
          ev.currentTarget.remove();
          scheduleDraft();
        },
      }));
    }

    const stateBlk = el('div.editor-block', {},
      el('div.blk-title', {},
        el('span', { text: '当时的状态' }),
        el('span.hint', { text: '可多选，也是统计"我最容易在哪吃亏"的依据' })
      ),
      stateChips
    );

    const causeInput = el('input.field', { placeholder: '一句话说清根因' });
    causeInput.value = st.cause;
    causeInput.addEventListener('input', () => {
      st.cause = causeInput.value;
      scheduleDraft();
    });

    const causeBlk = el('div.editor-block', {},
      el('div.blk-title', {}, el('span', { text: '为什么会这样' })),
      causeInput
    );

    const lessonEl = el('textarea.field', { rows: 2, placeholder: '下次遇到同样的事，具体怎么做' });
    lessonEl.value = st.lesson;
    lessonEl.addEventListener('input', () => {
      st.lesson = lessonEl.value;
      lessonEl.style.height = 'auto';
      lessonEl.style.height = Math.max(46, lessonEl.scrollHeight) + 'px';
      scheduleDraft();
    });

    const lessonBlk = el('div.editor-block.editor-lesson', {},
      el('div.blk-title', {},
        el('span', { text: '⭐ 下次怎么做' }),
        el('span.hint', { text: '填了才会进经验库' })
      ),
      lessonEl
    );

    blocksWrap.append(stateBlk, causeBlk, lessonBlk, tagsBlock());
  }

  /* ---------- 标签 ---------- */

  function tagsBlock() {
    const chips = el('div.chips');
    for (const t of st.tags) {
      chips.append(el('button.chip', {}, `#${t}`,
        el('span.x', {
          text: '×',
          onclick: (ev) => {
            ev.stopPropagation();
            st.tags = st.tags.filter((x) => x !== t);
            paintBlocks();
            scheduleDraft();
          },
        })
      ));
    }

    const input = el('input', { placeholder: '加标签，回车确认' });
    input.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
        e.preventDefault();
        commit();
      }
    });
    input.addEventListener('blur', commit);

    function commit() {
      const v = input.value.trim().replace(/^#/, '');
      if (!v) return;
      if (!st.tags.includes(v)) st.tags.push(v);
      input.value = '';
      paintBlocks();
      scheduleDraft();
      // 重新聚焦到新的输入框
      const again = blocksWrap.querySelector('.tag-input-row input');
      if (again) again.focus();
    }

    const row = el('div.tag-input-row', {}, chips, input);

    // 最近用过的标签
    const recents = recentTags(10).filter((t) => !st.tags.includes(t));
    let recentRow = null;
    if (recents.length) {
      recentRow = el('div.chips', { style: { marginTop: '8px' } });
      for (const t of recents.slice(0, 8)) {
        recentRow.append(el('button.chip.tag-chip', {
          text: '#' + t,
          onclick: () => {
            if (!st.tags.includes(t)) st.tags.push(t);
            paintBlocks();
            scheduleDraft();
          },
        }));
      }
    }

    return el('div.editor-block', {},
      el('div.blk-title', {}, el('span', { text: '标签' })),
      row,
      recentRow
    );
  }

  /* ---------- 保存 ---------- */

  async function save() {
    st.content = textEl.value;
    const hasAnything = st.content.trim() || st.cause.trim() || st.lesson.trim()
      || st.states.length || st.tags.length;
    if (!hasAnything) {
      toast('还没有内容');
      return false;
    }
    const payload = {
      type: st.type,
      content: st.content.trim(),
      cause: st.cause.trim(),
      lesson: st.lesson.trim(),
      states: st.states,
      tags: st.tags,
      categoryId: st.categoryId,
      date: st.date,
    };
    if (editing) payload.id = editing.id;
    else payload.id = uid();

    const saved = await saveEntry(payload);
    clearDraft();
    toast(editing ? '已保存' : (st.lesson.trim() ? '已保存，经验 +1' : '已保存'));
    if (typeof onSaved === 'function') onSaved(saved);
    return true;
  }

  /* ---------- 组装 ---------- */

  const body = el('div.editor-body', {},
    top,
    contentWrap,
    blocksWrap,
    el('div.exit-hint', {
      text: editing ? '修改会同步更新到经验库' : '内容会自动存为草稿，关掉也不会丢',
    })
  );

  paintSeg();
  paintCatPill();
  paintBlocks();

  const sheet = openSheet({
    title: editing ? '编辑记录' : '新记录',
    left: { label: '取消' },
    right: { label: editing ? '保存' : '完成', onClick: () => save() },
    body,
    onClose: () => {
      st.content = textEl.value;
      if (!editing) writeDraft(st);
    },
  });

  requestAnimationFrame(() => {
    autoGrow();
    if (!editing && restored) toast('已恢复上次未保存的草稿');
    else if (!editing) textEl.focus();
  });

  return sheet;
}