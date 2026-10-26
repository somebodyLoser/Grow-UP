/* 本地预览用的小服务器（零依赖）
 *
 * 用法：双击「双击预览.bat」，或在本目录执行 node preview.js
 * 参数：--no-open  只启动不开浏览器；--port=8080 指定端口
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = __dirname;
const argv = process.argv.slice(2);
const noOpen = argv.includes('--no-open');
const portArg = argv.find((a) => a.startsWith('--port='));
const startPort = portArg ? Number(portArg.split('=')[1]) : 8000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let rel;
  try {
    rel = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    res.writeHead(400); res.end('bad url'); return;
  }
  if (rel.endsWith('/')) rel += 'index.html';
  if (rel === '/') rel = '/index.html';

  const file = path.join(ROOT, rel);
  const inside = path.resolve(file).startsWith(path.resolve(ROOT));

  if (!inside || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404 ' + rel);
    return;
  }

  res.writeHead(200, {
    'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
});

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn(cmd, [url], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch {
    /* 打不开就算了，用户自己复制地址 */
  }
}

let port = startPort;
let tries = 0;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && tries < 20) {
    tries += 1;
    port += 1;
    server.listen(port, '127.0.0.1');
    return;
  }
  console.error('启动失败：', err.message);
  process.exit(1);
});

server.on('listening', () => {
  const url = `http://127.0.0.1:${port}/`;
  console.log('');
  console.log('  自我记录 · 本地预览已启动');
  console.log('  ' + url);
  console.log('');
  console.log('  浏览器里按 F12 → 设备模拟 → 选 iPhone 看效果。');
  console.log('  用完直接关掉这个黑窗口即可。');
  console.log('');
  if (!noOpen) openBrowser(url);
});

server.listen(port, '127.0.0.1');