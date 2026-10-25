# LizPink 个人终端

[访问网站](https://lizpink.github.io/)

基于 HTML、CSS 和 JavaScript 的个人网站，包含生活与记录、经历与能力、研究与探索三个栏目，支持终端命令、目录导航和琥珀／荧绿主题。

## 目录

```text
.
├── index.html              # 页面入口
├── favicon.svg
├── .nojekyll               # 直接发布静态文件
└── assets/
    ├── js/                 # 内容、命令与交互
    ├── css/                # 页面和输入区样式
    ├── fonts/              # 本地字体及许可
    └── media/              # 图片、视频、封面与字幕
```

## 本地预览

在仓库根目录运行（需要 Python）：

```sh
python -m http.server 4173 --bind 127.0.0.1
```

打开 [本地预览](http://127.0.0.1:4173/)。网站无需安装依赖或构建。

## 日常维护

| 文件 | 职责 |
| --- | --- |
| `assets/js/content.js` | 个人介绍、栏目、图文和简历 |
| `assets/js/commands.js` | 命令定义、帮助及补全候选 |
| `assets/js/summaries.js` | 栏目摘要 |
| `assets/js/app.js` | 页面渲染、导航和会话 |
| `assets/js/command-input.js` | 命令输入模式与自动吸附 |
| `assets/js/theme.js` | 初始主题和偏好保存 |
| `assets/css/styles.css` | 颜色、字体和布局 |
| `assets/css/command-input.css` | 输入区样式 |

首页文字在 `index.html`。媒体放入 `assets/media/`，内容路径写作 `./assets/media/文件名`。替换示例图文后，将对应条目的 `example` 设为 `false`。PDF 可放入 `files/resume.pdf`，再设置 `resume.pdfUrl`。

## 发布

提交到 `main` 后由 GitHub Pages 发布，网站保持在 [lizpink.github.io](https://lizpink.github.io/)。本仓库独立运行，旧 Hugo 仓库已退出发布流程。

本地完整维护项目使用 `dist/` 保存本仓库的文件；发布时将其内容同步到本仓库根目录，并同步移除已废弃文件。字体许可位于 `assets/fonts/`。
