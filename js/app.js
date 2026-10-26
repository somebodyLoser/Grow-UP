/* 应用入口：初始化、Tab 切换、刷新、Service Worker */

import { init } from './store.js';
import { todayKey } from './utils/date.js';
import * as today from './ui/today.js';
import * as lessons from './ui/lessons.js';
import * as review from './ui/review.js';
import * as me from './ui/me.js';

// 供 index.html 里的兜底提示判断「模块脚本是否真的跑起来了」
window.__selflogModuleLoaded = true;

const PAGES = { today, lessons, review, me };
const TITLES = { today: '今天', lessons: '经验库', review: '回顾', me: '我的' };

let active = 'today';
let booted = false;
let dayLoaded = todayKey();

/* ---------------- 渲染 ---------------- */

function pageEl(tab) {
  return document.getElementById('page-' + tab);
}

function renderPage(tab) {
  const page = pageEl(tab);
  if (!page) return;
  const inner = page.querySelector('.page-inner');
  if (!inner) return;
  try {
    inner.replaceChildren(PAGES[tab].render());
  } catch (err) {
    console.error('渲染失败：', tab, err);
    inner.replaceChildren();
  }
  syncNavbar(page);
}

function syncNavbar(page) {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  nav.classList.toggle('show', (page ? page.scrollTop : 0) > 6);
}

/* ---------------- Tab ---------------- */

function switchTo(tab, { force = false } = {}) {
  if (!PAGES[tab]) tab = 'today';
  const changed = tab !== active;
  active = tab;

  document.querySelectorAll('.tabbar .tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.querySelectorAll('.page').forEach((p) => {
    p.classList.toggle('active', p.id === 'page-' + tab);
  });

  const titleEl = document.getElementById('navbarTitle');
  if (titleEl) titleEl.textContent = TITLES[tab];

  if (changed || force) renderPage(tab);
  else syncNavbar(pageEl(tab));

  // 滚动条回到顶部时隐藏吸顶标题
  syncNavbar(pageEl(tab));
}

/* ---------------- 事件 ---------------- */

function bindTabs() {
  const bar = document.getElementById('tabbar');
  if (!bar) return;
  bar.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.tab');
    if (!btn) return;
    const tab = btn.dataset.tab;
    if (!tab) return;
    if (tab === active) {
      // 再点一次当前 Tab：回到顶部
      const page = pageEl(active);
      if (page) page.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    switchTo(tab, { force: true });
  });
}

function bindScroll() {
  for (const tab of Object.keys(PAGES)) {
    const page = pageEl(tab);
    if (!page) continue;
    let ticking = false;
    page.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (tab === active) syncNavbar(page);
      });
    }, { passive: true });
  }
}

function bindDataChanged() {
  document.addEventListener('data-changed', () => {
    if (!booted) return;
    // 当前页立即重绘，其它页在切换时重绘
    renderPage(active);
  });
}

function bindVisibility() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const now = todayKey();
    if (now !== dayLoaded) {
      dayLoaded = now;
      renderPage(active);
    }
  });
}

/* ---------------- Service Worker ---------------- */

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (!location.protocol.startsWith('http')) return;

  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // 首次安装也会触发，只有「已存在旧版本」时才重载
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* 离线能力不可用不影响主流程 */
    });
  });
}

/* ---------------- 启动 ---------------- */

async function boot() {
  try {
    await init();
  } catch (err) {
    console.error('存储初始化失败：', err);
    const inner = document.querySelector('#page-today .page-inner');
    if (inner) {
      inner.textContent = '存储初始化失败：' + (err && err.message ? err.message : err);
    }
    return;
  }

  booted = true;
  bindTabs();
  bindScroll();
  bindDataChanged();
  bindVisibility();
  switchTo('today', { force: true });
  registerSW();
}

boot();