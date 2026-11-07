# LizPink 个人终端

[在线访问](https://lizpink.github.io/) · [项目源码](https://github.com/LizPink/LizPink.github.io)

一个使用 HTML、CSS 和 JavaScript 编写的个人网站，网站基于 GPT-6.1 VibeCoding。

## 项目结构

```text
lizpink-terminal/
├── content/                   # 日常写作与素材
│   ├── site.yml               # 网站介绍、简历与栏目配置
│   └── entries/
│       ├── journal/           # 日常文字
│       ├── notebook/          # 兴趣图文
│       ├── profile/           # 经历文字
│       ├── question/          # 项目文字
│       ├── geometry/          # 图片内容
│       │   ├── index.md       # 标题、日期、所属栏目、摘要和正文
│       │   └── demo-geometry.svg
│       └── animation/         # 视频内容
│           ├── index.md
│           ├── demo-orbit.mp4
│           ├── demo-orbit.poster.svg  # 同名视频封面
│           └── demo-orbit.zh.vtt      # 同名中文字幕
├── site/                      # 网站界面源码
│   ├── index.html             # 页面骨架与站点字段占位符
│   ├── .nojekyll              # GitHub Pages 静态发布标记
│   ├── favicon.svg            # 网站图标
│   └── assets/
│       ├── css/
│       │   ├── styles.css            # 主题、排版与通用组件
│       │   ├── command-input.css     # 命令输入区
│       │   ├── content-sidebar.css   # 左侧内容目录
│       │   └── article-outline.css   # 本页目录与阅读布局
│       ├── js/
│       │   ├── app.js                # 页面初始化、路由与终端交互
│       │   ├── commands.js           # 命令定义、补全候选与帮助正文
│       │   ├── command-input.js      # 输入编辑、补全与历史
│       │   ├── content-index.js      # 内容索引、日期排序与内容链接
│       │   ├── summaries.js          # 栏目摘要与文章展示
│       │   ├── content-sidebar.js    # 左侧目录、折叠与调宽
│       │   ├── article-outline.js    # 本页目录与章节定位
│       │   ├── sidebar-shortcuts.js  # 左右目录快捷键
│       │   ├── output-motion.js      # 分段输出动效
│       │   └── theme.js              # 主题切换与偏好
│       └── fonts/             # 本地字体及授权说明
├── scripts/
│   ├── build-content.mjs      # 解析配置与 Markdown，生成内容和素材
│   ├── asset-version.mjs      # 按文件内容生成资源版本，减少旧缓存影响
│   ├── build.mjs              # 组装完整网站，生成带资源版本的引用
│   ├── dev.mjs                # 监听源码变化，重建并刷新本地预览
│   └── serve.mjs              # 本地服务与视频分段请求
├── dist/                      # 自动生成的发布目录，不提交或手工编辑
├── .build/                    # 临时构建目录与构建锁，不提交
├── tests/                     # 内容构建、资源版本、命令、目录与动效检查
├── docs/                      # 维护、产品与设计说明
│   ├── CONTENT.md             # 发布文章、图片、视频及 PDF 的操作指南
│   ├── PRODUCT.md             # 产品行为与功能约定
│   └── DESIGN.md              # 界面设计与交互约定
├── .github/workflows/
│   └── deploy-pages.yml       # 推送 main 后检查、构建并发布 dist/
├── .openai/hosting.json        # Sites 托管配置
├── .impeccable/design.json     # 设计数据
├── package.json               # 项目依赖与开发、构建、检查命令
├── package-lock.json          # 锁定依赖版本
└── .gitignore                 # 排除生成文件与本地依赖
```

每篇内容文件夹都包含 `index.md`，图片、视频、封面和字幕与正文放在一起。可选的 PDF 简历放入 `content/files/`，并在 `content/site.yml` 中配置链接。构建会生成 `dist/assets/js/content.js` 和 `dist/assets/content/`，日常更新修改对应的源文件即可。

## 本地维护

使用 Node.js 22 或更新版本。首次运行 `npm ci` 安装项目依赖，然后运行 `npm run dev`，打开终端提示的本地地址。修改 `content/` 中的 Markdown、配置或素材后，预览会自动更新；错误内容会在终端提示，保留上一版可用预览。

运行 `npm test` 构建并检查，`npm run build` 仅生成发布文件。推送 `main` 后由 GitHub Actions 自动构建并发布；功能分支供本地体验，推送不会更新线上网站。

新增文章、图片、视频、字幕和 PDF 的具体步骤见 [内容维护指南](docs/CONTENT.md)。
