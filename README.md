# LizPink 个人终端

[在线访问](https://lizpink.github.io/) · [项目源码](https://github.com/LizPink/LizPink.github.io/tree/codex/site-source)

使用 HTML、CSS 和 JavaScript 编写的个人网站，包含生活、经历和研究三个栏目，支持目录导航、终端命令及琥珀／荧绿主题。直接维护静态文件，无需安装依赖或构建。

## 项目结构

```text
lizpink-terminal/
├── dist/                      # 网站源码与发布目录
│   ├── index.html             # 页面入口
│   ├── README.md              # GitHub 发布仓库的说明
│   ├── favicon.svg
│   ├── .nojekyll
│   └── assets/
│       ├── js/                # 内容、命令与页面交互
│       ├── css/               # 布局、主题与输入区样式
│       ├── fonts/             # 本地字体及许可
│       └── media/             # 图片、视频与字幕
├── docs/                      # 产品、设计和历史记录
│   ├── PRODUCT.md
│   ├── DESIGN.md
│   ├── previews/              # 历史预览图
│   ├── verification/          # 验证记录
│   ├── deployment/            # 发布记录
│   └── archive/               # 旧版文档
├── .openai/hosting.json        # Sites 托管配置
└── .impeccable/design.json     # 设计数据
```

## 本地预览

在项目根目录运行（需要 Python）：

```sh
python -m http.server 4173 --bind 127.0.0.1 --directory dist
```

打开 [本地预览](http://127.0.0.1:4173/)，按 `Ctrl+C` 停止服务。

## 修改网站

| 修改内容 | 位置 |
| --- | --- |
| 自我介绍、栏目、图文与简历 | `dist/assets/js/content.js` |
| 首页文字与页面结构 | `dist/index.html` |
| 颜色、字体与布局 | `dist/assets/css/styles.css` |
| 命令、帮助与补全候选 | `dist/assets/js/commands.js` |
| 栏目摘要 | `dist/assets/js/summaries.js` |
| 导航、渲染与会话 | `dist/assets/js/app.js` |
| 输入模式与自动吸附 | `dist/assets/js/command-input.js`、`dist/assets/css/command-input.css` |
| 初始主题与偏好保存 | `dist/assets/js/theme.js` |

图片和视频放入 `dist/assets/media/`，内容路径使用 `./assets/media/文件名`。替换示例后，将对应条目的 `example` 改为 `false`。PDF 可放入 `dist/files/resume.pdf`，并设置 `resume.pdfUrl`。

脚本按 `theme → content → commands → summaries → command-input → app` 加载；其中 `theme.js` 在样式之前运行，其余脚本使用 `defer`。

## 同步与发布

本地通过 `origin` 连接 `LizPink/LizPink.github.io`，当前维护分支为 `codex/site-source`：

- `codex/site-source`：完整项目，包含 `dist/`、文档和配置。
- `main`：GitHub Pages 的发布文件，目录对应 `dist/` 内部。

在维护分支保存修改：

```sh
git add .
git commit -m "Update website"
git push
```

推送维护分支会同步完整项目。发布网站时，将 `dist/` **内部文件**同步到 `main` 根目录，包含 `.nojekyll`，同步移除已废弃文件。GitHub Pages 部署成功后检查公开网址。`main` 根目录对应本地的 `dist/`，使用其中的 README。

Sites 使用同一份 `dist/`，独立发布；更新 Sites 不会自动同步 GitHub Pages。

详细约定见 [产品说明](docs/PRODUCT.md)和[设计说明](docs/DESIGN.md)。字体许可随字体保存在 `dist/assets/fonts/`。
