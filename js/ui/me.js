/* 我的：统计 / 管理入口 / 备份 / 关于 */

import { el } from '../utils/dom.js';
import { S, stats, exportData, exportText, importData } from '../store.js';
import { cell, section, openSheet, toast, actionSheet, confirmAction } from './components.js';
import { notifyChanged } from './detail.js';
import { openCategoryManager, openStateManager, openTagManager } from './manage.js';

export const APP_VERSION = '1.0.0';

export function render() {
  const frag = el('div');
  const st = stats();

  // ---------- 头部 ----------
  frag.append(
    el('div.me-head', {},
      el('div.me-avatar', { text: '记' }),
      el('div', {},
        el('div.me-name', { text: '我的记录本' }),
        el('div.me-sub', {
          text: st.total
            ? `已经记了 ${st.total} 条 · ${st.lessons} 条经验`
            : '还没有开始，去「今天」写第一条',
        })
      )
    )
  );

  // ---------- 数据概览 ----------
  frag.append(
    el('div.section', {},
      el('div.stat-row', {},
        statNode(st.total, '记录'),
        statNode(st.postmortems, '复盘'),
        statNode(st.lessons, '经验'),
        statNode(st.chars, '字')
      )
    )
  );

  // ---------- 管理 ----------
  frag.append(
    section('管理',
      cell({ icon: '🗂', title: '分类管理', value: `${S.categories.length} 个`, chevron: true, onClick: openCategoryManager }),
      cell({ icon: '🎚', title: '状态词管理', value: `${S.states.length} 个`, chevron: true, onClick: openStateManager }),
      cell({ icon: '#', title: '标签管理', chevron: true, onClick: openTagManager })
    )
  );

  // ---------- 备份 ----------
  frag.append(
    section('备份与导出',
      cell({ icon: '⬇️', title: '导出备份（.json）', sub: '可以导回，换手机就靠它', chevron: true, onClick: doExportJson }),
      cell({ icon: '📄', title: '复制全部为文字', sub: '纯文本，贴到备忘录里存一份', chevron: true, onClick: doExportText }),
      cell({ icon: '⬆️', title: '导入备份', sub: '从 .json 文件恢复', chevron: true, onClick: doImport })
    )
  );

  frag.append(el('div.foot-note', {
    text: '所有记录只存在这台设备上，不上传任何服务器。清空浏览器数据会把记录一起清掉，建议每月导出一次备份。',
  }));

  // ---------- 关于 ----------
  frag.append(
    section('关于',
      cell({ icon: 'ℹ️', title: '版本', value: 'v' + APP_VERSION }),
      cell({ icon: '🔄', title: '检查更新', sub: '下拉或点这里强制拉取新版本', chevron: true, onClick: forceUpdate }),
      cell({ icon: '🧹', title: '清空所有数据', danger: true, chevron: true, onClick: clearAll })
    )
  );

  frag.append(el('div', { style: { height: '20px' } }));

  return frag;
}

function statNode(num, lab) {
  return el('div.stat', {}, el('span.num', { text: String(num) }), el('span.lab', { text: lab }));
}

/* ==================== 备份 ==================== */

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function download(name, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name, style: { display: 'none' } });
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 2000);
}

async function doExportJson() {
  if (!S.entries.length) return toast('还没有记录可以导出');
  download(`自我记录-${stamp()}.json`, JSON.stringify(exportData(), null, 2), 'application/json');
  toast('已导出，去「文件」App 里找找');
}

async function doExportText() {
  if (!S.entries.length) return toast('还没有记录可以导出');
  const text = exportText();
  try {
    await navigator.clipboard.writeText(text);
    toast(`已复制 ${S.entries.length} 条记录`);
  } catch {
    // 剪贴板不可用时退回到「文件下载」
    download(`自我记录-${stamp()}.md`, text, 'text/markdown');
    toast('剪贴板不可用，已改为下载文件');
  }
}

function doImport() {
  const input = el('input', {
    type: 'file',
    accept: '.json,application/json',
    style: { display: 'none' },
  });
  document.body.append(input);

  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    input.remove();
    if (!file) return;

    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      return toast('这个文件不是有效的备份');
    }

    const mode = await actionSheet({
      title: `准备导入 ${Array.isArray(data.entries) ? data.entries.length : 0} 条记录`,
      message: '合并会保留现有记录，覆盖会清空当前所有记录。',
      actions: [
        { label: '合并进来', value: 'merge' },
        { label: '覆盖现有数据', value: 'replace', danger: true },
      ],
    });
    if (!mode) return;

    if (mode === 'replace') {
      const ok = await confirmAction('确定覆盖？', '当前设备上的记录、分类、状态词会被全部替换，无法撤销。', '覆盖');
      if (!ok) return;
    }

    try {
      const n = await importData(data, { merge: mode === 'merge' });
      notifyChanged();
      toast(mode === 'merge' ? `合并了 ${n} 条记录` : '已恢复备份');
    } catch (err) {
      toast('导入失败：' + (err.message || '未知错误'));
    }
  });

  input.click();
}

/* ==================== 关于 ==================== */

function forceUpdate() {
  openSheet({
    title: '检查更新',
    left: { label: '关闭' },
    body: el('div', { style: { padding: '4px 20px 24px' } },
      el('div.about-line', { text: '这个 App 是从 GitHub Pages 加载的。iOS 的主屏 App 没有下拉刷新，所以更新后需要手动清一次缓存。' }),
      el('div', { style: { height: '18px' } }),
      el('button.btn.primary', {
        text: '清除缓存并重新加载',
        onclick: async () => {
          try {
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            }
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
          } catch {}
          location.reload();
        },
      }),
      el('div', { style: { height: '10px' } }),
      el('div.about-line', {
        text: '注意：清缓存不会删除你的记录（记录在浏览器的数据库里，不在缓存里）。但如果你误用了 Safari 的「清除网站数据」，记录会一起消失——所以定期导出备份。',
      })
    ),
  });
}

async function clearAll() {
  const ok = await confirmAction(
    '清空所有数据？',
    '所有记录、分类、状态词都会被删除，且无法撤销。建议先导出一份备份。',
    '全部清空'
  );
  if (!ok) return;
  const again = await confirmAction('真的要清空吗？', '这是最后一次确认。', '确认清空');
  if (!again) return;

  await importData({ entries: [], categories: [], states: [] }, { merge: false });
  notifyChanged();
  toast('已清空');
}