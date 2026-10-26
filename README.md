# 自我记录 · SelfLog

一个纯前端的「自我记录 + 事件复盘」小应用。iOS 风格，手机优先，装到 iPhone 主屏后看起来和原生 App 一样。

- 没有任何后端、没有任何账号，**所有内容只存在你自己的设备上**
- 纯 HTML + CSS + 原生 JS，无框架、无构建步骤，改完直接刷新就是新版
- 数据存在浏览器的 IndexedDB 里，离线也能用（有 Service Worker）

---

## 四个页面

| 页面 | 干什么 |
| --- | --- |
| **今天** | 按日期倒序的时间流。顶部是「现在，你想记点什么？」，一个按钮开始记录；下方是连续记录天数、今天的记录、往日记录。 |
| **经验库** | 所有填了「⭐ 下次怎么做」的记录会汇总到这里，按标签筛选，随时翻出来复用。这是这个 App 和普通日记最大的区别。 |
| **回顾** | 日历热力图（每天记录越多颜色越深）、「我在什么状态下最容易吃亏」「踩坑最多的场景」两条洞察、以及那年今日。 |
| **我的** | 数据统计、分类 / 状态词 / 标签管理、导出备份、导入备份、检查更新。 |

## 两种记法

点「今天」页的记录按钮后，编辑器顶部可以切换：

- **随手记**：只写正文，适合记一句话、一个想法
- **复盘**：正文 + 分类 + 标签 + **当时状态** + 为什么会这样 + **⭐ 下次怎么做**

只有填了「⭐ 下次怎么做」的复盘，才会进经验库。状态词（赶时间 / 不好意思拒绝 / 不懂行 / 图便宜 / 情绪上头 / 太累了 / 没看条款 / 被催促）是给自己贴「当时我处在什么状态」用的标签，它的价值在于——记录多了以后，你能从回顾页看出自己反复栽在哪种状态下。

分类、状态词、标签都可以自己加、改名、删掉。改名会同步更新所有历史记录；删掉状态词只是把它从选择列表里移走，历史记录里的原话会保留。

---

## 在电脑上先看看效果

**双击 `双击预览.bat`** 就行了 —— 它会自动起一个小服务器（`preview.js`，零依赖）并打开浏览器。端口 8000 被占用时会自动往后找。

打开后按 F12 → 打开设备模拟 → 选 iPhone 尺寸看效果。关掉那个黑窗口就等于关掉服务器。

为什么不能直接双击 `index.html`？因为用了 ES Module 和 Service Worker，在 `file://` 协议下浏览器会因为 CORS 策略拦掉模块脚本，页面会是白屏（控制台报 `blocked by CORS policy`）。这是浏览器的规定，不是页面写错了。真双击了 `index.html` 的话，页面会显示一段提示告诉你改用 `双击预览.bat`。

手动起服务器也行：

```bash
node preview.js          # 本项目自带
# 或者
npx serve .
# 或者
python -m http.server 8000
```

---

## 部署到 GitHub Pages

1. 在 GitHub 上新建一个仓库（名字随意，比如 `selflog`），**不要**勾选自动生成 README。
2. 把本目录下的所有文件推到仓库根目录：

   ```bash
   git init
   git add .
   git commit -m "init selflog"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/selflog.git
   git push -u origin main
   ```

3. 打开仓库 → **Settings → Pages** → Source 选 `Deploy from a branch`，Branch 选 `main`、目录选 `/ (root)`，保存。
4. 等 1～2 分钟，访问 `https://<你的用户名>.github.io/selflog/`。

几点必须注意的：

- **所有路径都是相对路径**（`./css/...`、`./js/...`）。Pages 把站点部署在 `/<仓库名>/` 子路径下，写成 `/css/base.css` 这种绝对路径会 404。
- 仓库里已经带了 `.nojekyll` 空文件，别删。它让 GitHub 跳过 Jekyll 处理，避免下划线开头的文件被忽略。
- 用 https 访问，Service Worker 只在 https（或 localhost）下生效。

## 装到 iPhone 主屏幕

1. 用 **Safari** 打开上面那个 Pages 网址（用 Chrome 装不了）。
2. 点底部的「分享」按钮 → **添加到主屏幕** → 右上角「添加」。
3. 从主屏那个蓝色「记」图标打开，就是全屏无地址栏的 App 样子了。

⚠️ **以后只从主屏图标进**。Safari 里直接访问同一个网址，在主屏 App 的眼里是**另一个**存储空间——你在 Safari 标签页里记的东西不会出现在 App 里，反之亦然。

## 更新代码后怎么看新版

- iOS 的主屏 App **没有下拉刷新**，也没有「检查更新」按钮。
- 本项目的 Service Worker 策略是：页面导航网络优先，静态资源先给缓存、后台拉新。
  所以一般 **关掉 App 再打开一次** 就是新版；偶尔不生效，就进 **我的 → 检查更新 → 清除缓存并重新加载**。
- 清缓存**不会**删掉你的记录（记录在数据库里，不在缓存里）。

## 备份（重要）

数据只在这台设备的这个浏览器里。以下情况会**永久丢数据**，且找不回来：

- 在 iOS「设置 → Safari → 清除历史记录与网站数据」
- 卸载/重装浏览器、换手机、换系统
- 用无痕模式打开

所以：**我的 → 导出备份（.json）**，把文件存到「文件」App / iCloud / 电脑上。换手机时用 **导入备份** 恢复（导入时会问你是「合并」还是「覆盖」）。

`我的 → 复制全部为文字` 会生成一份纯文本（Markdown 风格），适合直接贴到备忘录里。

---

## 图标

`assets/icon-180.png`（iOS 主屏）、`icon-192.png`、`icon-512.png`（PWA 清单）由 `tools/make-icons.mjs` 用 SVG 生成，不要手改位图。

四套备选方案，想换就执行一次：

```bash
node tools/make-icons.mjs A   # 一页笔记 + 星（当前使用）
node tools/make-icons.mjs B   # 一支笔（深色）
node tools/make-icons.mjs C   # 记录条
node tools/make-icons.mjs D   # 一页 + 书签
```

生成后刷新页面即可；**手机上要更新主屏图标，必须先长按图标删除，再重新「添加到主屏幕」**——iOS 会缓存旧图标。

想改配色或形状，直接在 `tools/make-icons.mjs` 顶部的 SVG 字符串里改（`#5C7CFF` 这类色值、`rect` 的 x/y/width/height），再跑一次。

---

## 文件结构

```
├── 双击预览.bat            本地预览：双击它（自动起服务器 + 开浏览器）
├── preview.js              零依赖静态服务器（bat 调用的就是它）
├── tools/
│   └── make-icons.mjs      图标生成器（SVG → PNG，部署时不需要）
├── index.html              页面骨架（4 个 section + 底部 Tab）
├── manifest.webmanifest    PWA 清单
├── sw.js                   Service Worker（离线 + 更新策略）
├── .nojekyll               让 GitHub Pages 跳过 Jekyll
├── assets/                 图标 180 / 192 / 512
├── css/
│   ├── base.css            变量、深色模式、布局骨架
│   ├── components.css      卡片、单元格、弹层、按钮等通用件
│   └── pages.css           各页面专用样式
└── js/
    ├── app.js              入口：初始化、Tab 切换、刷新、注册 SW
    ├── db.js               IndexedDB 的薄封装
    ├── store.js            数据模型与所有业务查询（唯一的数据出口）
    ├── utils/
    │   ├── dom.js          el() 等极简 DOM 工具（不用 innerHTML 拼接）
    │   └── date.js         日期格式化
    └── ui/
        ├── components.js   弹层、输入框、Toast、单元格
        ├── cards.js        记录卡片 / 经验卡片
        ├── today.js        今天页
        ├── editor.js       编辑器（双模式 + 草稿自动保存）
        ├── detail.js       详情页
        ├── lessons.js      经验库
        ├── review.js       回顾页
        ├── manage.js       分类 / 状态词 / 标签管理
        └── me.js           我的页（统计、备份、关于）
```

数据想以后接云同步的话，改 `js/store.js` 一处就够：所有读写都从那里出去。