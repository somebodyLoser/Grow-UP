/* 图标生成器：用 SVG 描述，借 Edge 无头渲染成 PNG
 *
 *   node tools/make-icons.mjs            → 用默认方案生成 assets/icon-{512,192,180}.png
 *   node tools/make-icons.mjs A          → 指定方案（A / B / C / D）
 *   node tools/make-icons.mjs sheet      → 只生成候选对比图 .tmp-icons/sheet.png
 *
 * 之所以这么做：SVG 里所有曲线都是精确的，渲染出来的边缘比用脚本画位图干净得多。
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, '.tmp-icons');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const DEFAULT = 'A';

/* ---------------- 通用零件 ---------------- */

const star = (cx, cy, ro, ri, fill) => {
  const pts = [];
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? ro : ri;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `<path d="M${pts.join(' L')} Z" fill="${fill}"/>`;
};

const shadow = `<filter id="sh" x="-30%" y="-30%" width="160%" height="160%">
  <feDropShadow dx="0" dy="20" stdDeviation="28" flood-color="#100A2E" flood-opacity="0.30"/>
</filter>`;

/* ---------------- 方案 A：一页笔记 + 一颗星 ---------------- */

const A = `
<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0.05" y1="0" x2="0.75" y2="1">
      <stop offset="0" stop-color="#5C7CFF"/>
      <stop offset="0.55" stop-color="#6C5CF5"/>
      <stop offset="1" stop-color="#8E43EE"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.24" cy="0.16" r="0.62">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="page" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#E7ECFF"/>
    </linearGradient>
    <linearGradient id="star" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0" stop-color="#FFE399"/>
      <stop offset="1" stop-color="#FFAA18"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>
  <g filter="url(#sh)">
    <rect x="298" y="222" width="428" height="556" rx="80" fill="url(#page)"/>
  </g>
  <rect x="372" y="348" width="280" height="36" rx="18" fill="#C4CEF6"/>
  <rect x="372" y="426" width="280" height="36" rx="18" fill="#C4CEF6"/>
  <rect x="372" y="504" width="180" height="36" rx="18" fill="#C4CEF6"/>
  <g transform="translate(748,748) scale(0.86)">
    ${star(0, 0, 112, 48, 'url(#star)')}
  </g>
</svg>`;

/* ---------------- 方案 B：一支笔（深色） ---------------- */

const B = `
<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#171A24"/>
      <stop offset="1" stop-color="#2A3147"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.78" cy="0.2" r="0.66">
      <stop offset="0" stop-color="#5C7CFF" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#5C7CFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="pen" x1="0" y1="0" x2="1" y2="0.4">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#D9E0FF"/>
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5C7CFF" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#8E43EE" stop-opacity="0.35"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>

  <rect x="196" y="716" width="440" height="34" rx="17" fill="url(#line)"/>

  <g transform="translate(556,470) rotate(34)" filter="url(#sh)">
    <rect x="-62" y="-286" width="124" height="360" rx="62" fill="url(#pen)"/>
    <rect x="-46" y="-252" width="16" height="240" rx="8" fill="#5C7CFF" opacity="0.28"/>
    <path d="M-54,74 L54,74 L0,186 Z" fill="url(#pen)"/>
  </g>
</svg>`;

/* ---------------- 方案 C：记录条 ---------------- */

const C = `
<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#22B8FF"/>
      <stop offset="0.6" stop-color="#3D7BFF"/>
      <stop offset="1" stop-color="#5B45E8"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.2" cy="0.12" r="0.7">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>
  <rect x="272" y="316" width="480" height="46" rx="23" fill="#ffffff" opacity="0.55"/>
  <rect x="272" y="432" width="366" height="46" rx="23" fill="#ffffff" opacity="0.78"/>
  <rect x="272" y="548" width="252" height="46" rx="23" fill="#ffffff"/>
  <rect x="272" y="664" width="176" height="46" rx="23" fill="#FFD24A"/>
</svg>`;

/* ---------------- 方案 D：一页 + 书签 ---------------- */

const D = `
<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.55" y2="1">
      <stop offset="0" stop-color="#37C0F5"/>
      <stop offset="1" stop-color="#0B59D6"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.26" cy="0.14" r="0.66">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.3"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="page" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#E4F1FF"/>
    </linearGradient>
    <linearGradient id="rib" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFB33D"/>
      <stop offset="1" stop-color="#FF7A1A"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>
  <g filter="url(#sh)">
    <rect x="298" y="196" width="428" height="632" rx="78" fill="url(#page)"/>
  </g>
  <path d="M452,196 H572 V486 L512,428 L452,486 Z" fill="url(#rib)"/>
  <rect x="372" y="586" width="280" height="34" rx="17" fill="#BFD6F6"/>
  <rect x="372" y="662" width="184" height="34" rx="17" fill="#BFD6F6"/>
</svg>`;

const VARIANTS = { A, B, C, D };
const NAMES = { A: '一页笔记 + 星', B: '一支笔', C: '记录条', D: '一页 + 书签' };

/* ---------------- 渲染 ---------------- */

function render(svg, size, out) {
  const html = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#fff}svg{display:block;width:${size}px;height:${size}px}</style>
${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}`;
  const tmp = path.join(OUT, `_r${size}.html`);
  fs.writeFileSync(tmp, html, 'utf8');
  execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${size},${size}`,
    `--screenshot=${out}`,
    'file:///' + tmp.replace(/\\/g, '/'),
  ], { stdio: 'ignore' });
  fs.rmSync(tmp, { force: true });
}

function renderSheet(out) {
  const cell = (k) => `<div class="c"><div class="ic">${VARIANTS[k].replace('<svg ', '<svg width="220" height="220" ')}</div><div class="n">${k} · ${NAMES[k]}</div></div>`;
  const html = `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;background:#fff;font:600 15px -apple-system,"Segoe UI",sans-serif;color:#333}
  .row{display:flex;gap:26px;padding:26px}
  .c{text-align:center}
  .ic svg{display:block;border-radius:34px;width:220px;height:220px}
  .n{margin-top:12px;font-size:14px;color:#666}
</style>
<div class="row">${['A', 'B', 'C', 'D'].map(cell).join('')}</div>`;
  const tmp = path.join(OUT, '_sheet.html');
  fs.writeFileSync(tmp, html, 'utf8');
  execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--window-size=1050,320',
    `--screenshot=${out}`, 'file:///' + tmp.replace(/\\/g, '/'),
  ], { stdio: 'ignore' });
  fs.rmSync(tmp, { force: true });
}

/* ---------------- 主流程 ---------------- */

fs.mkdirSync(OUT, { recursive: true });
const arg = (process.argv[2] || '').toUpperCase();

if (arg === 'SHEET') {
  const out = path.join(OUT, 'sheet.png');
  renderSheet(out);
  console.log('候选图:', out);
} else {
  const v = VARIANTS[arg] ? arg : DEFAULT;
  const svg = VARIANTS[v];
  for (const size of [512, 192, 180]) {
    render(svg, size, path.join(ROOT, 'assets', `icon-${size}.png`));
  }
  render(svg, 1024, path.join(OUT, `preview-${v}.png`));
  console.log(`已生成方案 ${v}（${NAMES[v]}）→ assets/icon-512.png / icon-192.png / icon-180.png`);
}