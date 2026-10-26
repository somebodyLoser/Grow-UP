/* 分类 / 状态词 / 标签 管理弹层 */

import { el } from '../utils/dom.js';
import {
  S, addCategory, updateCategory, deleteCategory, categoryCount,
  addState, renameState, deleteState, stateUsage,
  allTags, renameTag, deleteTag,
} from '../store.js';
import { openSheet, toast, actionSheet, promptSheet, confirmAction } from './components.js';
import { notifyChanged } from './detail.js';

const EMOJIS = ['💰', '🏥', '💼', '🤝', '🏠', '💡', '🛒', '🍜', '✈️', '📚', '🎮', '🏃', '❤️', '😤', '📝', '⚙️'];
const COLORS = ['#FF9500', '#FF3B30', '#007AFF', '#34C759', '#8E8E93', '#FFCC00', '#5856D6', '#30B0C7'];

/* ==================== 分类 ==================== */

export function openCategoryManager() {
  const body = el('div', { style: { padding: '0 0 20px' } });

  function paint() {
    body.replaceChildren();
    const card = el('div.card', { style: { margin: '0 16px' } });

    for (const c of S.categories) {
      const row = el('div.mrow', {},
        el('div.emoji-box', { text: c.icon }),
        el('div.grow', {},
          el('div.name', { text: c.name }),
          el('div.sub', { text: `${categoryCount(c.id)} 条记录` })
        ),
        el('button.mini', {
          text: '编辑',
          onclick: () => editCategory(c, paint),
        })
      );
      card.append(row);
    }

    if (!S.categories.length) {
      card.append(el('div.mrow', {}, el('div.grow', {}, el('div.name', { text: '还没有分类' }))));
    }

    card.append(el('button.mrow', {
      onclick: async () => {
        const name = await promptSheet({ title: '新建分类', placeholder: '分类名，比如：租房' });
        if (!name) return;
        const icon = await promptSheet({
          title: '选个图标', value: '📁', placeholder: '一个 emoji 即可', confirmLabel: '确定',
        });
        await addCategory({ name, icon: icon || '📁', color: COLORS[S.categories.length % COLORS.length] });
        paint();
        notifyChanged();
      },
    },
      el('div.emoji-box', { text: '＋' }),
      el('div.grow', {}, el('div.name', { style: { color: 'var(--blue)' }, text: '新建分类' }))
    ));

    body.append(card);
    body.append(el('div', {
      style: { padding: '14px 20px 0', fontSize: '12.5px', color: 'var(--label-3)', lineHeight: '1.7' },
      text: '分类是单层的，一条记录只能属于一个分类；多个主题的交叠请用标签表达。删除分类不会删掉记录，只会把它们变成「无分类」。',
    }));
  }

  paint();

  openSheet({
    title: '分类管理',
    left: { label: '关闭' },
    body,
    onClose: () => notifyChanged(),
  });
}

async function editCategory(cat, paint) {
  const act = await actionSheet({
    title: cat.name,
    actions: [
      { label: '改名', value: 'rename' },
      { label: '换图标', value: 'icon' },
      { label: '删除分类', value: 'del', danger: true },
    ],
  });
  if (!act) return;

  if (act === 'rename') {
    const name = await promptSheet({ title: '分类名', value: cat.name, confirmLabel: '保存' });
    if (!name) return;
    await updateCategory(cat.id, { name });
    paint();
    notifyChanged();
  } else if (act === 'icon') {
    const pick = await actionSheet({
      title: '选一个图标',
      actions: EMOJIS.map((e) => ({ label: e, value: e })),
    });
    if (!pick) return;
    await updateCategory(cat.id, { icon: pick });
    paint();
    notifyChanged();
  } else if (act === 'del') {
    const n = categoryCount(cat.id);
    const ok = await confirmAction(
      `删除「${cat.name}」？`,
      n > 0 ? `这 ${n} 条记录会变成「无分类」，记录本身不会丢。` : ''
    );
    if (!ok) return;
    await deleteCategory(cat.id);
    paint();
    notifyChanged();
    toast('已删除分类');
  }
}

/* ==================== 状态词 ==================== */

export function openStateManager() {
  const body = el('div', { style: { padding: '0 0 20px' } });

  function paint() {
    body.replaceChildren();
    const card = el('div.card', { style: { margin: '0 16px' } });

    for (const s of S.states) {
      card.append(el('div.mrow', {},
        el('div.grow', {},
          el('div.name', { text: s.name }),
          el('div.sub', { text: `出现在 ${stateUsage(s.name)} 条复盘里` })
        ),
        el('button.mini', {
          text: '编辑',
          onclick: () => editState(s, paint),
        })
      ));
    }

    if (!S.states.length) {
      card.append(el('div.mrow', {}, el('div.grow', {}, el('div.name', { text: '还没有状态词' }))));
    }

    card.append(el('button.mrow', {
      onclick: async () => {
        const name = await promptSheet({
          title: '新建状态词',
          placeholder: '比如：懒得问清 / 怕麻烦别人',
          confirmLabel: '添加',
        });
        if (!name) return;
        await addState(name);
        paint();
        notifyChanged();
      },
    },
      el('div.emoji-box', { text: '＋' }),
      el('div.grow', {}, el('div.name', { style: { color: 'var(--blue)' }, text: '新建状态词' }))
    ));

    body.append(card);
    body.append(el('div', {
      style: { padding: '14px 20px 0', fontSize: '12.5px', color: 'var(--label-3)', lineHeight: '1.7' },
      text: '状态词用来标记「当时我处在什么状态」，它和吃亏往往是因果关系。改名会同步更新所有历史记录；删除只从可选列表移除，历史记录里的原话保留。',
    }));
  }

  paint();

  openSheet({
    title: '状态词管理',
    left: { label: '关闭' },
    body,
    onClose: () => notifyChanged(),
  });
}

async function editState(st, paint) {
  const act = await actionSheet({
    title: st.name,
    actions: [
      { label: '改名（同步历史记录）', value: 'rename' },
      { label: '从列表移除', value: 'del', danger: true },
    ],
  });
  if (!act) return;

  if (act === 'rename') {
    const name = await promptSheet({ title: '状态词', value: st.name, confirmLabel: '保存' });
    if (!name) return;
    const touched = await renameState(st.id, name);
    toast(touched ? `已同步 ${touched} 条记录` : '已改名');
    paint();
    notifyChanged();
  } else if (act === 'del') {
    const ok = await confirmAction(
      `移除「${st.name}」？`,
      '它不会再出现在选择列表里，但历史记录中的原话不会被删除。'
    );
    if (!ok) return;
    await deleteState(st.id);
    paint();
    notifyChanged();
    toast('已移除');
  }
}

/* ==================== 标签 ==================== */

export function openTagManager() {
  const body = el('div', { style: { padding: '0 0 20px' } });

  function paint() {
    body.replaceChildren();
    const tags = allTags();
    const card = el('div.card', { style: { margin: '0 16px' } });

    for (const t of tags) {
      card.append(el('div.mrow', {},
        el('div.grow', {},
          el('div.name', { text: '#' + t.name }),
          el('div.sub', { text: `${t.count} 条记录${t.lessons ? ` · ${t.lessons} 条经验` : ''}` })
        ),
        el('button.mini', {
          text: '编辑',
          onclick: () => editTag(t.name, paint),
        })
      ));
    }

    if (!tags.length) {
      card.append(el('div.mrow', {}, el('div.grow', {},
        el('div.name', { text: '还没有标签' }),
        el('div.sub', { text: '写记录时在标签栏输入，回车即可创建' })
      )));
    }

    body.append(card);
    body.append(el('div', {
      style: { padding: '14px 20px 0', fontSize: '12.5px', color: 'var(--label-3)', lineHeight: '1.7' },
      text: '标签是从记录里自动汇总出来的，不需要提前建。改名会把所有记录里的同名标签一起改掉。',
    }));
  }

  paint();

  openSheet({
    title: '标签管理',
    left: { label: '关闭' },
    body,
    onClose: () => notifyChanged(),
  });
}

async function editTag(name, paint) {
  const act = await actionSheet({
    title: '#' + name,
    actions: [
      { label: '改名（同步历史记录）', value: 'rename' },
      { label: '从所有记录里移除', value: 'del', danger: true },
    ],
  });
  if (!act) return;

  if (act === 'rename') {
    const next = await promptSheet({ title: '标签名', value: name, confirmLabel: '保存' });
    if (!next) return;
    const touched = await renameTag(name, next);
    toast(touched ? `已更新 ${touched} 条记录` : '已改名');
    paint();
    notifyChanged();
  } else if (act === 'del') {
    const ok = await confirmAction(
      `从所有记录里移除 #${name}？`,
      '只删除标签本身，记录内容不受影响。'
    );
    if (!ok) return;
    const touched = await deleteTag(name);
    toast(`已从 ${touched} 条记录中移除`);
    paint();
    notifyChanged();
  }
}