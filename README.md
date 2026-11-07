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
│           ├── LICENSE.md			 # Source Serif 4 许可
│           ├── IBMPlexMono-Regular.woff2  # 命令、路径与输入
│           ├── IBMPlexMono-Medium.woff2   # 命令与快捷键强调
│           └── IBM-Plex-Mono-LICENSE.txt # IBM Plex Mono 许可
├── scripts/
│   ├── build-content.mjs      # 解析配置、Markdown 与 HTML，生成内容和素材
│   ├── html-content.mjs       # 常见 HTML 标签与 Markdown 的统一解析
│   ├── content-paths.mjs      # 资源分隔符、绝对路径与发布路径转换
│   ├── content-dates.mjs      # 根据文章的 Git 提交计算更新日期
│   ├── asset-version.mjs      # 按文件内容生成资源版本，减少旧缓存影响
│   ├── build.mjs              # 组装完整网站，生成带资源版本的引用
│   ├── build-files.mjs        # 目录替换与清理的有限重试，处理临时文件占用
│   ├── dev.mjs                # 监听源码变化，重建并刷新本地预览
│   └── serve.mjs              # 本地服务与视频分段请求
├── dist/                      # 自动生成的发布目录，不提交或手工编辑
├── node_modules/              # 安装依赖时自动生成，已gitignore，不提交
├── .build/                    # 临时构建目录与构建锁，不提交
├── tests/                     # 构建、交互、主题与字体检查
│   ├── article-outline.test.cjs   # 本页目录与章节定位
│   ├── asset-version.test.cjs     # 静态资源版本
│   ├── build-content.test.cjs     # 内容解析与素材生成
│   ├── build-recovery.test.cjs    # 文件占用、发布回退与构建锁清理
│   ├── commands.test.cjs          # 命令解析、补全与帮助
│   ├── content-index.test.cjs     # 内容索引、日期与路由
│   ├── content-dates.test.cjs     # Git 内容日期与手动日期优先级
│   ├── content-sidebar.test.cjs   # 左侧目录与宽度调整
│   ├── font-assets.test.cjs       # 本地字体完整性与中文字形覆盖
│   ├── html-content.test.cjs      # HTML、混合正文与资源路径转换
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



## 内容更新

在网站中更新内容，只需要遵循一下步骤：创建内容文件夹 -> 内容正文 -> 内容素材 -> 预览 -> 发布即可。网站会按照规则自动解析我的新建内容，并且转换为网站代码。

1、首先在 `content/entries` 下新建内容文件夹，在其中创建一个名为 `index.md` 的文件，并且将对应地照片和视频资源加入到文件夹中。文件结构的一个示例如下

```text
content/entries/my-note/
├── index.md
├── photos/
│   └── screenshot.png
└── videos/
    ├── demo.mp4
    ├── demo.poster.png    # 可选封面
    └── demo.zh.vtt        # 可选字幕
```

其中 `index.md` 文件开头需要按照下面的格式写好元信息，文档内容会被解析为网页展示的内容。可以往这个 markdown 文档中加入图片和视频文件。

```markdown
---
title:			"我的第一个项目"
sections:		[project]
publishedAt:	"2026-11-07"
updatedAt:		"2026-11-07" # 可省略，默认自动计算
---

这里写文章的开头。

## 项目介绍

这里介绍项目。


## 展示效果

![项目截图](./photos/screenshot.png)

![项目演示视频](./videos/demo.mp4)
```

正文可以混写常见 HTML，例如 `<a href="https://example.com">项目主页</a>` 或 `<img src=".\photos\screenshot.png" alt="项目截图" style="zoom:33%;">`。Markdown 和 HTML 的素材路径均支持正斜杠、反斜杠，以及指向本篇素材的本机绝对路径；生成网站时统一转为发布路径，素材仍需放在本篇文章文件夹内。详细格式见 [内容维护指南](docs/CONTENT.md)。

2、当你创建好本地的内容文件之后，可以先进行构建测试与本地预览。具体而言，在项目根目录打开终端，运行命令。如果结果正常，则打开终端显示的网址，就可以看到预览内容。

```shell
npm test
npm run dev
```

3、当确认预览内容没有问题后，将新增文件提交到 Git 仓库，并合并、推送到 `main` 分支。GitHub 会自动检查并发布网站。
