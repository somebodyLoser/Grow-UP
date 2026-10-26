/* 通用 UI 组件：Toast / Sheet / ActionSheet / 分组列表 */

import { el, append } from '../utils/dom.js';

const overlayRoot = () => document.getElementById('overlay-root');

/* ==================== Toast ==================== */

let toastEl = null;
let toastTimer = 0;

export function toast(msg, ms = 1800) {
  if (!toastEl) {
    toastEl = el('div.toast');
    overlayRoot().append(toastEl);
  }
  toastEl.textContent = msg;
  // 强制重启过渡
  toastEl.classList.remove('show');
  void toastEl.offsetWidth;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

/* ==================== Sheet 弹层（可叠加） ==================== */

const sheetStack = [];
let baseZ = 100;

/**
 * openSheet({ title, left, right, body, dismissible })
 *   left / right: { label, onClick }  —— onClick 不返回值时默认关闭
 *   body: HTMLElement
 * 返回 { el, body, close, setTitle }
 */
export function openSheet(opts = {}) {
  const {
    title = '',
    left = null,
    right = null,
    body = null,
    dismissible = true,
    onClose = null,
  } = opts;

  const layer = sheetStack.length;
  const zBack = baseZ + layer * 4;
  const zSheet = zBack + 1;

  const backdrop = el('div.backdrop', { style: { zIndex: String(zBack) } });
  const sheet = el('div.sheet', { style: { zIndex: String(zSheet) } });

  let closed = false;

  const ctrl = {
    el: sheet,
    body: null,
    setTitle(t) {
      const tEl = sheet.querySelector('.sheet-title');
      if (tEl) tEl.textContent = t;
    },
    close() {
      if (closed) return;
      closed = true;
      sheet.classList.remove('show');
      backdrop.classList.remove('show');
      setTimeout(() => {
        sheet.remove();
        backdrop.remove();
        const i = sheetStack.indexOf(ctrl);
        if (i >= 0) sheetStack.splice(i, 1);
        if (typeof onClose === 'function') onClose();
      }, 360);
    },
  };

  const head = el('div.sheet-head');
  if (left) {
    head.append(el('button.sheet-btn', {
      text: left.label || '取消',
      onclick: () => {
        if (typeof left.onClick === 'function') {
          const r = left.onClick(ctrl);
          if (r === false) return; // 阻止关闭
        }
        ctrl.close();
      },
    }));
  }
  if (title) head.append(el('div.sheet-title', { text: title }));
  if (right) {
    head.append(el('button.sheet-btn.strong.spacer', {
      text: right.label || '完成',
      onclick: () => {
        if (typeof right.onClick === 'function') {
          const r = right.onClick(ctrl);
          if (r === false) return;
        }
        ctrl.close();
      },
    }));
  }

  const bodyEl = el('div.sheet-body');
  if (body) bodyEl.append(body);
  ctrl.body = bodyEl;

  sheet.append(head, bodyEl);

  if (dismissible) {
    backdrop.addEventListener('click', ctrl.close);
  }

  overlayRoot().append(backdrop, sheet);
  sheetStack.push(ctrl);

  requestAnimationFrame(() => {
    backdrop.classList.add('show');
    sheet.classList.add('show');
  });

  return ctrl;
}

/* ==================== ActionSheet ==================== */

/**
 * actionSheet({ title, actions: [{ label, danger, value }] })
 * 返回 Promise<value | null>
 */
export function actionSheet({ title = '', message = '', actions = [] } = {}) {
  return new Promise((resolve) => {
    const backdrop = el('div.backdrop', { style: { zIndex: '300' } });
    const wrap = el('div.action-wrap', { style: { zIndex: '301' } });

    const group = el('div.action-group');
    if (title) group.append(el('div.action-title', { text: title }));
    if (message) group.append(el('div.action-msg', { text: message }));
    for (const a of actions) {
      group.append(el('button.action-btn' + (a.danger ? '.danger' : ''), {
        text: a.label,
        onclick: () => finish(a.value !== undefined ? a.value : a.label),
      }));
    }

    const cancelGroup = el('div.action-group', {},
      el('button.action-btn.cancel', { text: '取消', onclick: () => finish(null) })
    );

    wrap.append(group, cancelGroup);
    overlayRoot().append(backdrop, wrap);

    let done = false;
    function finish(v) {
      if (done) return;
      done = true;
      wrap.classList.remove('show');
      backdrop.classList.remove('show');
      setTimeout(() => {
        wrap.remove();
        backdrop.remove();
      }, 340);
      resolve(v);
    }

    requestAnimationFrame(() => {
      backdrop.classList.add('show');
      wrap.classList.add('show');
    });
    backdrop.addEventListener('click', () => finish(null));
  });
}

/* ==================== 输入弹窗 ==================== */

/**
 * promptSheet({ title, value, placeholder, confirmLabel, multiline })
 * 返回 Promise<string | null>
 */
export function promptSheet({
  title = '',
  value = '',
  placeholder = '',
  confirmLabel = '保存',
  multiline = false,
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const input = multiline
      ? el('textarea.field', { placeholder, rows: 3 })
      : el('input.field', { type: 'text', placeholder });
    input.value = value;

    const body = el('div', { style: { padding: '4px 16px 20px' } }, input);

    const settle = (v) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };

    const sheet = openSheet({
      title,
      left: { label: '取消', onClick: () => settle(null) },
      right: {
        label: confirmLabel,
        onClick: () => {
          const v = input.value.trim();
          if (!v) {
            toast('不能为空');
            return false;
          }
          settle(v);
          return true;
        },
      },
      body,
      onClose: () => settle(null),
    });

    setTimeout(() => {
      input.focus();
      if (!multiline && input.setSelectionRange) {
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 380);

    return sheet;
  });
}

/** 二次确认，返回 Promise<boolean> */
export function confirmSheet({ title, message = '', confirmLabel = '删除', danger = true } = {}) {
  return actionSheet({
    title: message ? `${title}\n${message}` : title,
    actions: [{ label: confirmLabel, danger, value: true }],
  }).then((v) => v === true);
}

/* ==================== 分组列表单元 ==================== */

export function cell({
  icon = null,
  iconEl = null,
  title = '',
  sub = '',
  value = '',
  chevron = false,
  danger = false,
  onClick = null,
  right = null,
} = {}) {
  const lead = iconEl || (icon ? el('div.cell-icon', { text: icon }) : null);
  const bodyKids = [el('div.cell-title', { text: title })];
  if (sub) bodyKids.push(el('div.cell-sub', { text: sub }));

  const kids = [];
  if (lead) kids.push(lead);
  kids.push(el('div.cell-body', {}, ...bodyKids));
  if (value) kids.push(el('div.cell-value', { text: value }));
  if (right) kids.push(right);
  if (chevron) kids.push(el('div.chevron'));

  const node = el(onClick ? 'button.cell' : 'div.cell', { onclick: onClick || undefined }, ...kids);
  if (danger) node.classList.add('danger');
  return node;
}

export function section(title, ...children) {
  const wrap = el('div.section');
  if (title) wrap.append(el('div.section-title', { text: title }));
  const card = el('div.card');
  append(card, children);
  wrap.append(card);
  return wrap;
}

export function plainSection(title, ...children) {
  const wrap = el('div.section');
  if (title) wrap.append(el('div.section-title', { text: title }));
  append(wrap, children);
  return wrap;
}

export function emptyState(big, text) {
  return el('div.empty', {},
    el('span.big', { text: big }),
    el('div', { text })
  );
}

export function confirmAction(title, message, confirmLabel = '删除') {
  return actionSheet({
    title: message ? `${title}\n\n${message}` : title,
    actions: [{ label: confirmLabel, danger: true, value: true }],
  }).then((v) => v === true);
}