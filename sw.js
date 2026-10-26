/* 自我记录 Service Worker
 *
 * 更新策略（无需手动改版本号）：
 *   - 页面导航 / HTML：网络优先，离线才用缓存 → 改完 push，重开一次就是新版
 *   - 静态资源（js/css/图标）：先用缓存（瞬间打开），同时在后台拉最新版本写回缓存
 *     → 再打开一次即生效
 *   - 想立刻强制刷新：我的 → 关于 → 强制重新加载
 */

const CACHE = 'selflog-v1';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/components.css',
  './css/pages.css',
  './js/app.js',
  './js/db.js',
  './js/store.js',
  './js/ui/components.js',
  './js/ui/today.js',
  './js/ui/editor.js',
  './js/ui/detail.js',
  './js/ui/cards.js',
  './js/ui/lessons.js',
  './js/ui/review.js',
  './js/ui/me.js',
  './js/ui/manage.js',
  './js/utils/date.js',
  './js/utils/dom.js',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 单个文件失败不应让整个安装失败
    await Promise.all(PRECACHE.map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 导航请求 / HTML：网络优先
  const isDoc = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isDoc) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req) || await cache.match('./index.html');
        return hit || new Response('离线中', { status: 503, headers: { 'content-type': 'text/plain;charset=utf-8' } });
      }
    })());
    return;
  }

  // 静态资源：缓存优先 + 后台更新
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return hit || (await network) || new Response('', { status: 504 });
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});