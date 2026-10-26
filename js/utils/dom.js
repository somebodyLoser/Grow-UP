/* 极简 DOM 构建工具，避免任何 innerHTML 拼接，天然防注入 */

export function el(tag, props, ...kids) {
  // 支持 'div'、'div.cls'、'textarea#editorText'、'div#id.cls1.cls2'
  let spec = String(tag);
  let id = null;
  const hashIdx = spec.indexOf('#');
  if (hashIdx >= 0) {
    const rest = spec.slice(hashIdx + 1);
    const dot = rest.indexOf('.');
    id = dot >= 0 ? rest.slice(0, dot) : rest;
    spec = spec.slice(0, hashIdx) + (dot >= 0 ? rest.slice(dot) : '');
  }
  const parts = spec.split('.');
  const node = document.createElement(parts[0] || 'div');
  if (id) node.id = id;
  if (parts.length > 1) node.className = parts.slice(1).join(' ');

  if (props && typeof props === 'object') {
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') {
        node.className = (node.className ? node.className + ' ' : '') + v;
      } else if (k === 'text') {
        node.textContent = v;
      } else if (k === 'style' && typeof v === 'object') {
        Object.assign(node.style, v);
      } else if (k === 'dataset' && typeof v === 'object') {
        Object.assign(node.dataset, v);
      } else if (k.startsWith('on') && typeof v === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'value' && 'value' in node) {
        node.value = v;
      } else {
        node.setAttribute(k, v === true ? '' : v);
      }
    }
  }

  append(node, kids);
  return node;
}

export function append(node, kids) {
  for (const k of [kids].flat(10)) {
    if (k === null || k === undefined || k === false) continue;
    node.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
  return node;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** 把一段长文本里的标签高亮 —— 这里只做纯文本，不做高亮，保留函数位 */
export function svgIcon(paths, opts = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', opts.fill || 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', opts.strokeWidth || '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  for (const d of [paths].flat()) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}