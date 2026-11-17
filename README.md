# LizPink 个人终端

[在线访问](https://lizpink.github.io/)

个人网站项目，项目基于 GPT-6.1 VibeCoding 构建。

网站使用同一套页面展示中文和英文，右上角的 `EN` / `中文` 按钮切换当前语言，并保留当前文章、主题和阅读位置。日常维护中文内容，发布时通过 DeepSeek 增量生成英文，两种语言一起构建、检查和发布。

左右目录的标题整行均可点击收起。桌面收起后保留边缘展开入口，正文获得更多宽度；手机左侧使用抽屉，文章目录在正文上方折叠。`Ctrl+Alt+A` 切换内容目录，`Ctrl+Alt+B` 切换本页目录。

首页介绍、栏目说明、最近内容和简历说明使用各自正文列的全部可用宽度，在空间不足时自然换行。

## 项目结构

```text
lizpink-terminal/
├── content/                   # 日常写作与素材
│   ├── site.yml               # 网站介绍、简历与栏目配置
│   ├── entries/               # 每篇文章独立目录，新增内容放在此处
│   │   └── 2026Fall-Render-from-Scratch/
│   │       ├── index.md       # 渲染器项目介绍与更新日志
│   │       └── photos/        # 文章使用的图片
│   └── translations/
│       └── en.json            # 首版英文与主动维护的译文修订
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
│       │   ├── math.css              # 数学公式、中文与窄屏滚动
│       │   ├── image-viewer.css      # 同页图片预览与暗背景
│       │   └── image-comparison.css  # 两图分割线对比与标签
│       ├── js/
│       │   ├── app.js                # 页面初始化、路由与终端交互
│       │   ├── i18n.js               # 界面词典、语言选择、内容切换与偏好
│       │   ├── commands.js           # 命令定义、补全候选与帮助正文
│       │   ├── command-input.js      # 输入编辑、补全与历史
│       │   ├── content-index.js      # 内容索引、日期排序与内容链接
│       │   ├── summaries.js          # 常驻分区说明、简历行与最近10条概览
│       │   ├── content-sidebar.js    # 左侧目录、折叠与调宽
│       │   ├── article-outline.js    # 本页目录与章节定位
│       │   ├── image-viewer.js       # 图片预览、关闭与原位置恢复
│       │   ├── image-comparison.js   # 对比画布尺寸、键盘与加载状态
│       │   ├── sidebar-shortcuts.js  # 左右目录快捷键
│       │   ├── output-motion.js      # 分段输出动效
│       │   └── theme.js              # 主题切换与偏好
│       ├── vendor/img-comparison-slider/ # 本地图片对比组件及 MIT 许可
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
│   ├── math-content.mjs       # 数学语法标记与 KaTeX 构建时排版
│   ├── math-assets.mjs        # 发布同版本公式样式、字体与许可
│   ├── content-paths.mjs      # 资源分隔符、绝对路径与发布路径转换
│   ├── content-dates.mjs      # 根据文章的 Git 提交计算更新日期
│   ├── asset-version.mjs      # 按文件内容生成资源版本，减少旧缓存影响
│   ├── build.mjs              # 组装完整网站，生成带资源版本的引用
│   ├── build-files.mjs        # 目录替换与清理的有限重试，处理临时文件占用
│   ├── translations.mjs       # 可译文字提取、指纹复用、DeepSeek 请求与校验
│   ├── translate.mjs          # 本地与发布流程共用的增量翻译、完整性检查入口
│   ├── translation-config.mjs # 读取配置、环境变量覆盖与参数校验
│   ├── translation-cache.mjs  # 从 i18n-cache 分支恢复、保存持久译文
│   ├── ui-messages.mjs        # 收集界面词典与 t("中文文案")，纳入翻译
│   ├── dev.mjs                # 监听源码变化，重建并刷新本地预览
│   └── serve.mjs              # 本地服务与视频分段请求
├── dist/                      # 自动生成的发布目录，不提交或手工编辑
├── node_modules/              # 安装依赖时自动生成，已gitignore，不提交
├── .build/                    # 临时构建目录与构建锁，不提交
├── tests/                     # 构建、双语翻译、交互、主题与字体检查
│   ├── article-outline.test.cjs   # 本页目录与章节定位
│   ├── asset-version.test.cjs     # 静态资源版本
│   ├── bilingual-build.test.cjs   # 双语输出、译文完整性与发布构建
│   ├── build-content.test.cjs     # 内容解析与素材生成
│   ├── build-recovery.test.cjs    # 文件占用、发布回退与构建锁清理
│   ├── commands.test.cjs          # 命令解析、补全与帮助
│   ├── content-index.test.cjs     # 内容索引、日期与路由
│   ├── content-dates.test.cjs     # Git 内容日期与手动日期优先级
│   ├── content-sidebar.test.cjs   # 左侧目录与宽度调整
│   ├── font-assets.test.cjs       # 本地字体完整性与中文字形覆盖
│   ├── html-content.test.cjs      # HTML、混合正文与资源路径转换
│   ├── i18n.test.cjs              # 语言链接、偏好与界面切换
│   ├── image-comparison*.test.cjs # 对比块构建与交互
│   ├── image-viewer.test.cjs      # 图片预览与位置恢复
│   ├── math-*.test.cjs            # 公式解析、排版与资源发布
│   ├── output-motion.test.cjs     # 输出动效与生命周期
│   ├── sidebar-shortcuts.test.cjs # 目录快捷键
│   ├── site-build.test.cjs        # 整站构建与本地服务
│   ├── summaries.test.cjs         # 分区概览与最近内容
│   ├── theme.test.cjs             # 深浅模式、偏好与旧配色兼容
│   ├── translations.test.cjs      # 提取、复用、模型响应校验与失败处理
│   └── translation-*.test.cjs     # 配置、模型参数与持久译文缓存
├── docs/                      # 维护、产品与设计说明
│   ├── CONTENT.md             # 发布文章、图片、视频及 PDF 的操作指南
│   ├── PRODUCT.md             # 产品行为与功能约定
│   ├── DESIGN.md              # 界面设计与交互约定
│   └── I18N.md                # 中英文切换、DeepSeek 配置与译文维护
├── .github/workflows/
│   └── deploy-pages.yml       # 推送 main 后恢复译文、翻译、检查并发布 dist/
├── .openai/hosting.json       # Sites 托管配置
├── .impeccable/design.json    # 设计数据
├── package.json               # 项目依赖与开发、构建、检查命令
├── package-lock.json          # 锁定依赖版本
├── translation.config.json    # 翻译 API 地址、模型与思考程度的默认配置
├── .env.example               # 本地翻译环境变量示例，不含密钥
└── .gitignore                 # 排除生成文件与本地依赖
```

## 本地运行与常用命令

需要 Node.js 22 或更新版本。首次拉取项目后，在项目根目录运行 `npm ci` 安装依赖。

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 构建并开启本地预览，修改 `content/` 或 `site/` 后自动刷新。 |
| `npm run preview` | 构建并开启本地静态预览。 |
| `npm run build` | 生成 `dist/`，允许未翻译的新内容暂时保留中文。 |
| `npm test` | 构建并运行网站与翻译相关检查。 |
| `npm run translate` | 使用本地环境变量中的 API Key，翻译新增或改动的文字。 |
| `npm run translate:check` | 检查当前中文是否都有对应译文，不调用翻译 API。 |
| `npm run build:release` | 生成发布版本，缺少或过期的英文会使构建停止。 |

本地预览地址会显示在终端中。结束预览时，在启动它的终端按 `Ctrl+C`。修改 `translation.config.json` 或构建脚本后，重新运行相应命令；它们不在开发预览的自动监听范围内。

现有内容附带首版英文，本地预览无需 API Key。新增内容尚未翻译时，可以先查看中文版，再配置密钥翻译并检查英文。

## 中英文与 DeepSeek 配置

中文内容源位于 `content/site.yml` 和 `content/entries/*/index.md`。界面词典在 `site/assets/js/i18n.js`，组件通过 `t("中文文案")` 获取文字；构建时也会收集这些常量文案，纳入翻译。代码、公式、章节 ID、日期、链接和素材地址保留原样。图片中已经写入的中文、PDF 正文和视频字幕文件需要单独准备英文版本。

首次配置自动翻译时，在 GitHub 网站仓库进入 **Settings → Secrets and variables → Actions → New repository secret**，添加 `DEEPSEEK_API_KEY`，值填自己的 DeepSeek API Key。密钥只在构建时使用，访客点击语言按钮时读取已生成的内容，不会调用翻译 API。

根目录 `translation.config.json` 统一配置非密钥选项，当前配置为：

```json
{
  "baseURL": "https://api.deepseek.com",
  "model": "deepseek-flash",
  "reasoningEffort": "high"
}
```

`reasoningEffort` 可设为 `none`、`low`、`high` 或 `max`，其中 `none` 关闭思考模式，其余选项开启相应程度的思考。也可以进入 **Settings → Secrets and variables → Actions → Variables → New repository variable**，设置以下覆盖值：

| GitHub Variable / 本地环境变量 | 对应 JSON 配置 | 未覆盖时的取值 |
| --- | --- | --- |
| `DEEPSEEK_BASE_URL` | `baseURL` | 当前配置为 `https://api.deepseek.com`。 |
| `DEEPSEEK_MODEL` | `model` | 当前配置为 `deepseek-flash`。 |
| `DEEPSEEK_REASONING_EFFORT` | `reasoningEffort` | 当前配置为 `high`。 |
| `DEEPSEEK_MAX_TOKENS` | `maxTokens` | 非思考模式 16384，开启思考 65536。 |
| `DEEPSEEK_TIMEOUT_MS` | `timeoutMs` | 非思考模式 60000，开启思考 180000。 |
| `DEEPSEEK_TEMPERATURE` | `temperature` | 0.2，仅非思考模式发送。 |

非空环境变量 / GitHub Variables 优先于 JSON 配置，未填写的选项使用配置文件与程序默认值。API Key 只放入 Secret，不写入 JSON、Variables 或源码。调整模型或思考程度会影响之后新增或改动的待译文字，已有译文继续复用。

本地需要翻译时，将 `.env.example` 复制为已被 Git 忽略的 `.env.local`，填入自己的 API Key，然后运行：

```powershell
node --env-file=.env.local scripts/translate.mjs
npm run translate:check
```

自动发布的流程为：恢复已有译文 → 翻译改动 → 检查网站和英文完整性 → 保存译文 → 发布中英文。译文按“原文 + 术语表版本 + 翻译规则版本”的指纹复用，不会因每次构建重复翻译全部文章。

- `content/translations/en.json` 保存源码随附的英文和主动提交的人工修订。
- GitHub 的 `i18n-cache` 分支持久保存自动翻译结果，只更新该分支的同名文件，不回写 `main`，也不会循环触发网站部署。
- 恢复缓存时，当前源码中的译文优先，因此人工修订不会被旧缓存覆盖。工作流已声明缓存所需的 `contents: write` 权限；`GITHUB_TOKEN` 由 GitHub 自动提供，无需自行配置。

翻译、缓存保存或完整性检查失败时，本次发布停止，线上继续保留上一次成功发布的版本。详细的配置、译文修订与语言链接说明见[中英文与自动翻译](docs/I18N.md)。

## 内容更新

更新内容按以下步骤进行：创建文章目录 → 编写正文 → 放入素材 → 本地预览 → 提交发布。网站会解析新增内容并生成对应页面。

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

需要比较两次渲染结果时，在正文中直接写一个 `:::compare` 块，里面恰好放两张图片。第一张在分割线左侧，第二张在右侧；图片说明作为两侧标签。以下示例外层的代码围栏只用于 README 展示，写入正文时只复制其中内容：

```markdown
:::compare
![仅直接光照](./photos/before.png)
![加入间接光照](./photos/after.png)
:::
```

块内也支持 HTML `<img>`，沿用第一张图的 `width` 或 `zoom` 设置整个对比区域的显示大小。鼠标或触摸可拖动分割线，键盘聚焦后用左右方向键调整，点击“放大对比”可进入灯箱继续比较。两图放进以第一张图比例为准的共同画布，保持各自原比例、完整显示；比例稍有差异时允许留边，不自动裁剪或拉伸。截图范围或视角不同仍需先对齐。一个块只接受两张图片，不混入视频和其它正文；写法不完整时构建会指出问题。

2、当你创建好本地的内容文件之后，可以先进行构建测试与本地预览。具体而言，在项目根目录打开终端，运行命令。如果结果正常，则打开终端显示的网址，就可以看到预览内容。

```shell
npm test
npm run dev
```

3、当确认预览内容没有问题后，将新增文件提交到 Git 仓库，并合并、推送到 `main` 分支。GitHub 会自动恢复译文、翻译变化的文字，再检查并发布中英文网站。也可以在 Actions 的 **Deploy website** 中手动选择 **Run workflow** 重新运行。

数学公式支持 `$...$` 行内写法和 `$$` 独立公式块；中文写在 `\text{...}` 中，详细示例见[内容维护指南](docs/CONTENT.md#添加数学公式)。

## 第三方来源与许可

数学排版使用 [KaTeX](https://katex.org/) **0.19.1**，数学语法解析使用 [@mdit/plugin-tex](https://mdit-plugins.github.io/tex.html) **1.3.0**，均采用 MIT License，版本固定在 `package.json` 和依赖锁文件中。KaTeX 在生成网站时运行，发布目录 `dist/assets/vendor/katex/` 包含同一安装版本的原始样式、字体及 `LICENSE`；浏览器无需加载 KaTeX JavaScript 或外部 CDN。源码与许可分别来自 [KaTeX 官方仓库](https://github.com/KaTeX/KaTeX) 和 [mdit-plugins 官方仓库](https://github.com/mdit-plugins/mdit-plugins)。

图片拖动对比使用 [img-comparison-slider](https://github.com/sneas/img-comparison-slider)，许可证版权署名为 **Dmytro Snisarenko（Copyright © 2019）**。本项目固定使用 **8.0.7**，以 [npm 同版本发布包](https://www.npmjs.com/package/img-comparison-slider/v/8.0.7) 为来源，采用 **MIT License**。

运行库及上游许可证保存在 [`site/assets/vendor/img-comparison-slider/`](site/assets/vendor/img-comparison-slider/)，随静态网站一同发布；访客使用时无需连接 CDN。本网站自己的 `image-comparison.js`、`image-comparison.css` 和文章构建逻辑负责对比块语法、图片尺寸适配、标签及灯箱集成。上游的使用方式和参数见 [组件文档](https://github.com/sneas/img-comparison-slider/blob/master/packages/img-comparison-slider/README.md)。

获取来源：运行库、样式与 source map 来自 [8.0.7 发布压缩包](https://registry.npmjs.org/img-comparison-slider/-/img-comparison-slider-8.0.7.tgz)，许可证保留自 [上游 LICENSE](https://github.com/sneas/img-comparison-slider/blob/master/LICENSE)。上游文件原样保留，页面使用本站自有样式，不加载 vendor 的 `styles.css`。
