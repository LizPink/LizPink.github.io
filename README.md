# LizPink 个人终端

[在线访问](https://lizpink.github.io/)

个人网站项目，项目基于 GPT-6.1 VibeCoding 构建。

## 项目结构

```text
lizpink-terminal/
├── content/                   # 日常写作与素材
│   ├── site.yml               # 网站介绍、简历与栏目配置
│   └── entries/               # 当前为空，新增文章放在此处
│       └── .gitkeep           # 保留空目录，不生成文章
├── site/                      # 网站界面源码
│   ├── index.html             # 页面骨架与站点字段占位符
│   ├── .nojekyll              # GitHub Pages 静态发布标记
│   ├── favicon.svg            # 网站图标
│   └── assets/
│       ├── css/
│       │   ├── styles.css            # 主题、排版与通用组件
│       │   ├── command-input.css     # 命令输入区
│       │   ├── content-sidebar.css   # 左侧内容目录
│       │   ├── article-outline.css   # 本页目录与阅读布局
│       │   └── image-viewer.css      # 同页图片预览与暗背景
│       ├── js/
│       │   ├── app.js                # 页面初始化、路由与终端交互
│       │   ├── commands.js           # 命令定义、补全候选与帮助正文
│       │   ├── command-input.js      # 输入编辑、补全与历史
│       │   ├── content-index.js      # 内容索引、日期排序与内容链接
│       │   ├── summaries.js          # 常驻分区说明、简历行与最近10条概览
│       │   ├── content-sidebar.js    # 左侧目录、折叠与调宽
│       │   ├── article-outline.js    # 本页目录与章节定位
│       │   ├── image-viewer.js       # 图片预览、关闭与原位置恢复
│       │   ├── sidebar-shortcuts.js  # 左右目录快捷键
│       │   ├── output-motion.js      # 分段输出动效
│       │   └── theme.js              # 主题切换与偏好
│       └── fonts/                    # 随网站发布的字体及授权说明
│           ├── noto-sans-sc.css      # 中文字体按字形范围加载
│           ├── noto-sans-sc/         # 101 份 Noto Sans SC WOFF2 分片
│           │   └── NotoSansSC-000.woff2 … NotoSansSC-100.woff2
│           ├── NotoSansSC-README.md  # 中文字体来源、字重与发布说明
│           ├── NotoSansSC-OFL.txt    # 中文字体许可
│           ├── SourceSerif4Variable-Roman.ttf.woff2  # 标题与站点名称
│           ├── LICENSE.md           # Source Serif 4 许可
│           ├── IBMPlexMono-Regular.woff2  # 命令、路径与输入
│           ├── IBMPlexMono-Medium.woff2   # 命令与快捷键强调
│           └── IBM-Plex-Mono-LICENSE.txt # IBM Plex Mono 许可
├── scripts/
│   ├── build-content.mjs      # 解析配置与 Markdown，生成内容和素材
│   ├── asset-version.mjs      # 按文件内容生成资源版本，减少旧缓存影响
│   ├── build.mjs              # 组装完整网站，生成带资源版本的引用
│   ├── dev.mjs                # 监听源码变化，重建并刷新本地预览
│   └── serve.mjs              # 本地服务与视频分段请求
├── dist/                      # 自动生成的发布目录，不提交或手工编辑
├── node_modules/              # 安装依赖时自动生成，已gitignore，不提交
├── .build/                    # 临时构建目录与构建锁，不提交
├── tests/                     # 构建、交互、主题与字体检查
│   ├── article-outline.test.cjs   # 本页目录与章节定位
│   ├── asset-version.test.cjs     # 静态资源版本
│   ├── build-content.test.cjs     # 内容解析与素材生成
│   ├── commands.test.cjs          # 命令解析、补全与帮助
│   ├── content-index.test.cjs     # 内容索引、日期与路由
│   ├── content-sidebar.test.cjs   # 左侧目录与宽度调整
│   ├── font-assets.test.cjs       # 本地字体完整性与中文字形覆盖
│   ├── image-viewer.test.cjs      # 图片预览与位置恢复
│   ├── output-motion.test.cjs     # 输出动效与生命周期
│   ├── sidebar-shortcuts.test.cjs # 目录快捷键
│   ├── site-build.test.cjs        # 整站构建与本地服务
│   ├── summaries.test.cjs         # 分区概览与最近内容
│   └── theme.test.cjs             # 深浅模式、偏好与旧配色兼容
├── docs/                      # 维护、产品与设计说明
│   ├── CONTENT.md             # 发布文章、图片、视频及 PDF 的操作指南
│   ├── PRODUCT.md             # 产品行为与功能约定
│   └── DESIGN.md              # 界面设计与交互约定
├── .github/workflows/
│   └── deploy-pages.yml       # 推送 main 后检查、构建并发布 dist/
├── .openai/hosting.json       # Sites 托管配置
├── .impeccable/design.json    # 设计数据
├── package.json               # 项目依赖与开发、构建、检查命令
├── package-lock.json          # 锁定依赖版本
└── .gitignore                 # 排除生成文件与本地依赖
```
