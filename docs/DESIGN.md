---
name: LizPink 个人终端
description: 满视口统一背景、可调内容目录、Markdown单条阅读与终端交互
colors:
  dark-bg: "#151812"
  dark-chrome: "#20231c"
  dark-screen: "#080a08"
  dark-text: "#e9dcc0"
  dark-muted: "#b8aa8e"
  dark-accent: "#e6bc76"
  dark-accent-soft: "#292719"
  dark-line: "#454b3c"
  dark-line-soft: "#30372c"
  light-bg: "#f7f6f2"
  light-chrome: "#e9e8e2"
  light-screen: "#f7f6f2"
  light-text: "#171d23"
  light-muted: "#343c45"
  light-accent: "#24445f"
  light-accent-soft: "#e5ebef"
  light-line: "#8c949b"
  light-line-soft: "#d8dbda"
typography:
  display:
    fontFamily: '"Source Serif 4", "Noto Serif SC", "Source Han Serif SC", "Songti SC", SimSun, serif'
    fontSize: "38px"
    fontWeight: 500
    lineHeight: 1.3
  title:
    fontFamily: '"Source Serif 4", "Noto Serif SC", "Source Han Serif SC", "Songti SC", SimSun, serif'
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.4
  interface:
    fontFamily: '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif'
    fontSize: "17px"
    lineHeight: 1.9
  screen:
    fontFamily: '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  menu:
    fontFamily: '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif'
    fontSize: "16px"
    lineHeight: 1.5
  command:
    fontFamily: '"IBM Plex Mono", "Cascadia Mono", Consolas, "Microsoft YaHei", monospace'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  logo:
    fontFamily: '"Cascadia Code", "SFMono-Regular", Consolas, "Microsoft YaHei", monospace'
    fontSize: "18px"
    lineHeight: 1
    letterSpacing: "-2px"
  summary-title:
    fontFamily: '"Source Serif 4", "Noto Serif SC", "Source Han Serif SC", "Songti SC", SimSun, serif'
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.4
  summary:
    fontFamily: '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  details:
    fontFamily: '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif'
    fontSize: "17px"
    lineHeight: 1.9
rounded:
  square: "0"
  theme-control: "7px"
  theme-selection: "4px"
  dot: "50%"
spacing:
  small: "8px"
  control: "12px"
  medium: "16px"
  large: "24px"
  entry: "24px"
  output: "32px"
components:
  logo-mark:
    backgroundColor: "{colors.dark-accent}"
    textColor: "{colors.dark-bg}"
    width: "32px"
    height: "32px"
  theme-control:
    backgroundColor: "transparent"
    rounded: "{rounded.theme-control}"
  theme-option:
    backgroundColor: "{colors.dark-accent-soft}"
    textColor: "{colors.dark-accent}"
    rounded: "{rounded.theme-selection}"
    minWidth: "44px"
    height: "44px"
  menu-item:
    backgroundColor: "transparent"
    textColor: "{colors.dark-muted}"
    padding: "10px 12px"
  menu-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.dark-muted}"
    width: "44px"
    height: "44px"
  command-input:
    backgroundColor: "transparent"
    textColor: "{colors.dark-text}"
    padding: "11px 1ch 11px 0"
  details-summary:
    textColor: "{colors.dark-accent}"
    padding: "8px 0"
    height: "44px"
---

# Design System: LizPink 个人终端

## Overview

文中的文件路径均以项目根目录为基准。

**Creative North Star: "融入背景的个人终端"**

用户图示与最新明确修订是最高优先约束。网页铺满视口，页面、工具栏、侧栏、框架和主区共用屏幕底色；不使用居中限宽、外框、主区内框或套窗内缩。仅内部工具栏与侧栏保留细分隔线。

保留lp_与LizPink并排及主题开关。工具栏目录入口始终可见，桌面目录默认展开、可折叠调宽，手机使用抽屉；顶部为首页、生活01、经历02、项目03，下方为内容索引。首页集中显示问候、职业、关注内容与about个人介绍；不再维护顶层description或生成对应的HTML description meta；分区使用各自唯一的paths.description，经历不重复首页资料。命令输入、↑↓命令历史与7个命令保持；每次栏目切换替换旧输出并置顶。Markdown内容源码分离与本页目录已并入 `main`，作为当前正式维护流程。作者内容位于 `content/`，UI源码位于 `site/`，`dist/` 由构建生成。线上版本以对应 GitHub Actions 部署结果为准。

进入life/resume/project默认显示栏目标题、常驻description和最多10条最近内容，仅日期与标题，不足10条按实际显示且不显示媒体数量。经历常驻“简历”行，有PDF时为入口，无PDF时显示“PDF待添加”。open/close切换全栏全文与概览，只切换最近列表和正文；标题、说明和简历行不隐藏、不重复。栏目直达采用相同概览，单篇深链直接展示全文。阅读正文或展开详情时暂停跟随；输入采用自动吸附与命令模式。

**Key Characteristics:**

- 满视口、统一背景、零套窗内缩。
- 桌面默认展开、可折叠调宽的内容目录，手机使用抽屉。
- 四个纵向栏目入口、日期标题索引与单条深链接阅读。
- 常驻分区说明、最近10条概览与按需全文，保留阅读位置。
- 唯一自动吸附输入，命令模式固定底部，退出保留草稿。

## Colors

frontmatter 记录深色与浅色模式的18个颜色；运行来源为 `site/assets/css/styles.css`。深色保留原琥珀正文与强调色，辅助文字提高明度；浅色使用暖白背景、深墨文字与墨蓝强调色。

### Primary

强调色用于标志、提示符、块光标、链接与当前菜单；柔和强调底色用于模式选中项、代码和候选。深色模式使用琥珀强调与暖白文字，浅色模式使用墨蓝强调与深墨文字，不为文字添加光晕。

### Neutral

`screen` 是页面、工具栏、侧栏、框架和主区的统一底色。`text` 与 `muted` 承担正文和说明；两级线色用于内部细分隔及控件。`bg` 保留在标志镂空文字、选择和遮罩等局部，`chrome` 用于模式按钮悬停，不形成页面分层。图片预览沿用黑色遮罩及局部深色文字变量，避免浅色模式下控件失去对比。

**The Two Themes Rule.** 首次访问默认深色模式，不跟随系统浅色设置；另有浅色模式。右上角使用同一组内的两个原生图标按钮，太阳对应浅色、月亮对应深色；所有屏幕宽度都不显示模式文字，aria-label与title保留完整名称，aria-pressed表达当前选项。选中项同时使用强调图标、柔和底色与细轮廓。有效URL优先于有效保存偏好，再回退深色；旧 amber/green 链接与偏好均映射为深色。只有手动选择模式才保存，已有参数同步且保留其他参数与hash。CSS前应用主题，DOM加载后同步按钮状态；切换不增加终端输出。`theme` 不列入帮助和补全。

## Typography

正文、中文说明、摘要、帮助解释与界面使用本地Noto Sans SC（思源黑体），由 `--font-body` 统一控制；正文常规字重400，既有小标题和条目标题保留500，Markdown的strong、b及表头可使用真实700粗体。仅首页问候 `h1`、栏目标题 `.summary-title` 与站点名称 `.wordmark` 使用 `--font-heading`，保留本地Source Serif 4及中文系统衬线回退；其余正文分节标题随黑体。命令输入、回显、路径和快捷键继续使用本地IBM Plex Mono。终端正文16px、行高1.7；输入和回显16px、行高1.6。

首页role只配置“学生”值，“职业：”由UI添加，整行与关注行使用相同的普通次要文字色var(--muted)，不使用黄色强调。interests形成的“关注”行利用.frame-main剩余空间，不受72ch限制，真实空间不足时自然换行；about段落仍最大72ch且左对齐，窄屏不产生横向溢出。

分区概览16px黑体、400字重、行高1.7，栏目标题使用h2衬线、26px、500字重、行高1.4；说明最长72ch，最近列表仅显示日期与标题，不显示媒体数量。事实标签与值分列，480px及以下改为上下排列。详情使用17px黑体、行高1.9，分节标题为h3、经历条目为h4，不再重复栏目标题。Markdown源使用h2/h3章节，渲染时按文章所在层级调整。内容目录标题16px黑体、行高1.5；栏目按钮15px，条目标题17px，日期12px等宽，目录仅保留分区、日期和标题。帮助中的命令使用15px、500字重等宽，中文解释使用16px黑体、行高1.5；命令列固定8ch，“或N”独立对齐，使用CSS Grid而非制表符。底部六条快捷键的kbd使用14px、500字重IBM Plex Mono，说明使用14px黑体，可自然换行。命令按钮最小高度44px，组间距16px。闲置提示与编辑态空输入提示统一使用桌面14px、手机13px黑体，避免切换输入状态时字号缩小。

Noto Sans SC通过本地 `site/assets/fonts/noto-sans-sc.css` 声明，支持400–700字重；101份WOFF2分片位于 `site/assets/fonts/noto-sans-sc/`，以unicode-range按所需字符加载。正文与界面仍使用400/500，700用于语义粗体。字体声明不使用local()，运行时不依赖外部字体服务或访客本地安装。来源说明见 `site/assets/fonts/NotoSansSC-README.md`，许可见 `site/assets/fonts/NotoSansSC-OFL.txt`（SIL OFL 1.1），正文回退为Microsoft YaHei、PingFang SC、Segoe UI、sans-serif。标题衬线字体为 `site/assets/fonts/SourceSerif4Variable-Roman.ttf.woff2`，常规体字重200–900、自动光学字号，中文依次回退Noto Serif SC、Source Han Serif SC、Songti SC、SimSun、serif。IBM Plex Mono来自 [IBM官方仓库](https://github.com/IBM/plex)，本地文件为 `site/assets/fonts/IBMPlexMono-Regular.woff2`（400）与 `site/assets/fonts/IBMPlexMono-Medium.woff2`（500），等宽回退为Cascadia Mono、Consolas、Microsoft YaHei、monospace。字体使用 `font-display:swap`；预加载Source Serif 4与IBM Regular。原有两类字体许可分别见 `site/assets/fonts/LICENSE.md` 和 `site/assets/fonts/IBM-Plex-Mono-LICENSE.txt`。

首页问候38px、栏目标题26px，760px以下为30px与24px，360px以下问候28px。图文条目标题23px，760px以下21px。标志保留既有Cascadia Code等宽栈：32px方块、18px字、字距-2px，姓名24px衬线；手机为28px方块、16px字与22px姓名。

## Layout

`.site-shell`宽100%、高100dvh（回退100vh），margin与padding为0。框架及主区零套窗内缩。工具栏最小52px、内边距3px 16px，内容目录入口位于标志左侧且始终可见；目录内部另有收起按钮。有有效本页目录时另显示工具栏本页目录按钮，按钮title与aria-keyshortcuts提供Ctrl+Alt+B提示，手机仅显示图标；无有效目录时隐藏。

**滚动边界：** html、body、site-shell、terminal-frame、frame-layout、frame-main统一使用 `overflow:clip`，防止焦点或程序滚动带动外层；内容滚动只改变main的 `scrollTop`，main保持 `overflow:auto`。详情定位使用 `scrollWithinTerminal`，按目标相对main的顶部差减24px调整；执行新栏目命令时取消旧跟随帧，替换输出并将main.scrollTop归零；随后刷新输入区定位。`/` 聚焦与退出命令模式使用 `preventScroll` 保留阅读位置，不调用 `scrollIntoView` 滚动祖先容器。

桌面目录默认200px，占独立网格列；折叠后主区全宽。拖动separator可调180–420px，并给主内容至少320px；空间不足时夹取宽度。左右键每次16px，Home/End最小/最大，双击恢复200px，Escape取消拖动。主区独立滚动，内边距24px 32px，1000px以下水平28px。

760px以下目录为宽min(320px,90%)的左侧抽屉，不提供调宽分隔条，通过工具栏打开；主区内边距24px 20px。高度不超过540px时目录整体滚动，收起按钮所在标题行保持可见，避免四行栏目挤压内容列表。工具栏隐藏路径，模式按钮在所有宽度都只显示图标，1000px以下隐藏状态。输入行最小48px，闲置提示及编辑态返回阅读按钮最小44px；窄屏闲置与空输入提示13px并分行。记录间距桌面24px、手机20px，事实标签480px以下上下排列，屏幕仅显示当前页面，↑↓仍可回调命令历史。

栏目details展开行最小44px，正文相距16px。详情及单条reader中的文章段落、列表、引用和标题占满 `.article-body` 的可用宽度并左对齐，不再套用72ch限制；首页about、栏目概览及履历说明继续保留原有阅读行宽。有本页目录时，文章仍只占目录左侧的正文列，不侵入右侧180px目录及32px间距。媒体自身最大960px并在正文列内居中，按自然比例显示，小媒体不放大。运行时的 `--asset-width` 保存媒体原始宽度；可选 `--asset-display-width` 表示作者指定的像素或百分比宽度，`--asset-scale` 表示缩放倍数，默认为1。最终figure宽度按作者尺寸乘缩放倍数，并同时受正文可用宽度、960px及原始宽度限制；原始尺寸尚未加载时，以960px作为安全回退。图片下方仅保留居中图注，与图片共用figure宽度，长图注在同一宽度内换行。图片和图注作为一组：上文至图片、图注至下文均为32px，图片至图注为8px；桌面和手机沿用相同间距，相邻媒体外边距合并，不累加。图片普通点击在同页暗背景中居中预览，关闭后返回原图与原滚动位置；修饰点击及不支持同页预览时保留原图外链。命令区保留等高原位，原位不可见或有输出的命令模式停底，退出且原位可见时回流。

### 目录状态

| 状态 | 布局与触发 | 退出 |
| --- | --- | --- |
| 桌面展开 | 默认状态，占独立列，可调宽 | 工具栏、内部收起按钮或目录内Escape折叠；拖动时Escape仅取消拖动 |
| 桌面折叠 | 主区全宽，工具栏入口仍可见 | 工具栏展开并恢复会话宽度 |
| 手机关闭 | 每次进入手机模式的默认状态 | 工具栏打开抽屉 |
| 手机抽屉展开 | 遮罩、主区inert，焦点循环包含关闭、栏目与内容条目 | 选择后聚焦正文；关闭、Escape或遮罩后返回工具栏 |

工具栏同步aria-expanded。桌面选择和偏好宽度只存本次会话内存，跨导航及手机往返保留，不写localStorage，刷新恢复默认。取消图钉、悬停peek与延迟收起。

### 内容索引与单条阅读

顶部四个栏目自上而下每行一个，下方列表独立滚动。life/resume/project按Markdown元信息sections筛选，home/help显示生成内容的去重并集，共享条目以首次路径引用作为链接栏目。构建器生成各栏目的paths.items，作者不手工维护列表。目录按有效显示日期降序，无日期条目置后，同日采用生成结果的稳定顺序。每条首行为“分区 YYYY.MM.DD”，下方为标题，不渲染简介或类型标签；分区与链接所属栏目一致。空栏目显示简洁空态，不以占位文章填充；不添加示例旗标或徽标。

content-index.js负责栏目归属、hash及日期。点击目录条目或最近列表标题进入单条reader（例如新增my-note并归入项目后为#project/my-note），深链及前后导航均显示所选全文，仅创建该条媒体。单条不含details，open/close提示没有可展开详情；栏目summary/details与7个命令照旧。

列表与侧栏只显示单一有效日期，优先生成内容中的updatedAt，否则publishedAt；严格校验实际日历日。手填YYYY-MM-DD不做时区转换，Git提交时间戳按Asia/Shanghai换算为日期；无有效日期时排在最后并省略列表日期。正文标题下始终显示“创建于 YYYY.MM.DD · 更新于 YYYY.MM.DD”：创建项读取publishedAt；更新项依次使用手填updatedAt、整篇目录最近一次后续内容提交日期、创建日期。首次创建无后续内容提交时两项相同。Git记录缺失、历史不完整或Git不可用时不计算提交日期；未提交修改、仅构建或修改其他内容不产生新日期。创建日期缺失时创建项为“—”，没有任何可用日期时两项均为“—”；仅有效值生成time元素，“—”使用普通文本。publishedAt沿用为创建/首次发布日期，不新增createdAt；计算在构建时完成，不改写Markdown，不使用文件系统修改时间。不使用example/dateExample字段。文档内日期与媒体代码只用于新增操作示意，不生成线上文章。目录元信息采用6px横向间距，侧栏内容宽度不超过164px时缩为2px，日期不拆行。

### 本页目录

`site/assets/js/article-outline.js` 从构建得到的Markdown h2/h3标题元信息生成本页目录，仅在至少两个有效标题时创建；文章主标题不重复收录，h3在目录中缩进12px。左侧继续提供按同一日期规则排序的全量内容导航；右侧只定位当前文章内部章节，不收录分区最近10篇标题。

主区 `.frame-main` 可用宽度达到1000px时，`site/assets/css/article-outline.css` 默认使用180px右列与32px间距，目录随main独立滚动吸附；更窄时默认使用正文顶部折叠的原生details。无足够标题时不显示目录或空提示。目录为同背景、14px辅助文字，无卡片和阴影；当前章节以强调色与1px左线标记。

点击章节先暂停自动跟随，关闭窄屏目录，再只修改main.scrollTop并聚焦目标标题；不改写现有内容hash或增加章节路由历史。目录最大高度扣除输入区与安全余量，媒体加载和主区尺寸变化后刷新位置；切换内容时清理观察器、监听与临时焦点属性。

工具栏本页目录按钮与 `Ctrl+Alt+B` 共同切换当前可用本页目录：宽屏隐藏整个aside并释放180px右列，窄屏只展开/折叠目录内容，保留summary入口。手动显隐选择保存在本次会话内存，跨文章与宽窄切换沿用，刷新恢复宽屏显示/窄屏折叠的默认；没有有效目录时B不处理，不拦截该按键。

### 跟随与阅读

每次新栏目命令都替换当前输出、取消旧跟随帧并置顶，输入继续可用。ResizeObserver观察记录、命令区和主区，阅读、编辑、Tab和↑↓保持正文位置，不把新页面拉到底部。补全候选依据命令区上下空间选择展开方向并限高，列表可以独立滚动。

向上滚轮、触摸移动、滚动键、拖动滚动条、聚焦历史记录或展开详情暂停跟随；阅读期间内容增长不强拉到底。手动滑回距底部32px内可恢复。

点击本页目录后，只要正文滚动位置没有实际变化，就保留所选标题的高亮；多个末尾章节因页面高度限制而停在同一位置时也能分别选中。实际滚动后恢复自动章节追踪，手动滚到底部仍高亮最后一节。

项目文章的 `## 更新日志`（含英文 Changelog / Release notes）下，源 `###` 作为独立更新的起点，构建时标记 `.article-update-heading`，不依赖阅读页调整后的 h4/h5 层级。主题标题使用 24px、650 字重与当前主题强调色，日期保留在同一标题内，使用 14px 等宽辅助色，两者按空间自然换行；手机主题标题为 22px。第一篇延续 32px 上距，后续篇以前文到分隔线 48px、线到标题 24px 的节奏分开（手机为 32px 与 24px），标题到正文 20px。分隔线为 1px `--line-soft`；段落和媒体内部间距沿用既有规则。保留原标题 ID、文字与目录层级，下一处源 `##` 恢复普通章节排版。

数学公式在构建时由 `scripts/math-content.mjs` 使用 KaTeX 转为 HTML 与 MathML，正文保留可读的数学结构，浏览器不再运行公式渲染器。`scripts/html-content.mjs` 仅将不可由作者源文伪造的临时数学标记还原为受控 token，最终渲染公式，不扩大原始 HTML 标签及属性的允许范围。保留 `trust:false`、独立宏作用域、有限展开次数与尺寸；错误包含文章路径并阻止本次构建覆盖既有发布结果。

`site/assets/css/math.css` 控制公式排版：公式字号为正文的 1.1 倍，中文 `.cjk_fallback` 沿用 `--font-body`；独立公式使用 `.article-math-display`，上下留白 28px、内边距 12px 4px，超长时仅公式区域横向滚动，支持键盘聚焦和滚动。带编号公式为编号保留独立宽度，避免窄屏重叠。颜色继承当前主题。`scripts/math-assets.mjs` 将安装版本的 KaTeX 样式、其引用字体和许可证复制到生成目录，并由既有资源版本流程处理缓存；不依赖 CDN。

## Elevation & Depth

页面与背景相融，不用阴影、扫描线或额外窗框。桌面目录占独立列，手机抽屉层级覆盖，遮罩不透明度.7。

首页问候220ms淡入；命令回显100ms、输出180ms、详情展开160ms淡入；输入模式颜色和详情箭头140ms过渡。输出不再以clip-path裁切，也不移动正在被测量定位的正文或对输入位置添加过渡。首条输出贴齐主区顶部内边距，home之外的问候立即退出布局，键盘切换和目录导航均从顶部开始。块光标950ms、模式按钮图标与底色140ms；目录宽度实时调整、手机抽屉200ms。系统减少动态效果关闭动画与位移；未激活使用静态空心光标；只有input聚焦、页面有焦点且可见时，实心编辑光标才闪烁。减少动态效果时保持实心静态。状态直接跟随输入，不模拟等待。

### 流式展示

`site/assets/js/output-motion.js` 只控制新结果的呈现。完整摘要或帮助DOM一次创建，命令回显立即出现，随后按完整行渐显；摘要最长280ms，帮助最长550ms。帮助中的命令、数字与解释同行出现，组标题与首行同时出现。只改变透明度，不逐字更新、不改变高度、不逐行滚动；长文与媒体继续按需展开。

仅用户执行命令或点击导航时播放；初次载入、浏览器前后导航不重播。结果连同输入区无法放进当前可见高度时跳过分行效果，避免手机或软键盘下先滚过尚未显示的内容。同一结果最多播放一次。

新命令、切换栏目、返回阅读、向上滚动、触摸阅读、滚动键、拖动滚动条、点击或聚焦正在显示的结果、选择文字都会立即完成当前展示。输入节点、草稿、焦点与选择不受动画控制。系统减少动态效果、隐藏页面、不支持动画或播放失败时直接显示完整内容；播放中切换偏好或隐藏页面也立即完成。动画结束清理效果与临时监听，旧动画的异步回调不能结束后续播放。

## Shapes

页面与内容方角、内部细线。工具栏入口与内部收起按钮最小44px，提供无障碍名称及状态；分隔条在悬停、聚焦或拖动时强调，目录控件和条目使用内侧焦点轮廓，避免裁切。

模式按钮组使用1px细边框、7px圆角，无阴影；每个按钮44×44px，仅显示16px线性太阳/月亮图标，不显示模式文字，整个按钮组宽92px。选中底片内缩4px、圆角4px，保留选中轮廓；所有屏幕宽度保留完整aria-label、title与aria-pressed状态。360px以下工具栏左右8px、组间距6px、姓名20px，过长姓名省略，确保左右目录按钮同时出现时仍完整显示。块光标宽.65ch、高1.1em。输入无底线、无独立执行箭头；命令模式用编辑区柔和强调底色表达激活状态，输入区顶部不显示分隔线。

详情采用原生details/summary与CSS细chevron，关闭时向右、展开时向下；不增加额外卡片外壳。

## Components

- **导航与命令**：侧栏及路线数据依次为home、life、resume、project。7个公开命令为home/0、life/1、resume/2、project/3、open、close、help；commands.js的单一命令表派生解析路由、Tab候选、可点击帮助和错字建议。错误建议比较完整拼写，支持相邻字母交换，例如proejct建议project。视图只保留上述四项与help。只保留现行命令、数字和当前中文简写；clear从解析执行、补全、帮助和建议中移除；open/close/help显示为展开/收起/帮助，并支持展开、收起中文输入。历史命令及旧路由不再兼容。无效hash显示home，未识别命令提示帮助。
- **输入**：真实input处理编辑、选区和中文输入，镜像层只画光标；Enter执行，手机发送键。首次首页完成初始化后自动聚焦，空会话输入保留在首页资料下方；内容深链保持阅读。未激活空输入显示静态空心光标及可点击的激活/帮助提示；激活空输入仅在光标旁显示“输入 help 查询命令”，键入后收起。右侧保留“Esc 返回阅读”，退出时保留草稿。隐藏说明通过aria-describedby为输入提供持续操作指导。
- **Tab**：非Shift Tab保持输入焦点，唯一匹配补全、多匹配循环、空输入可用、无匹配不跳焦；成功补全不显示底部状态文案，候选listbox/option及输入选区保留，错误说明不受影响。候选关联combobox。Shift+Tab离开，↑↓调历史；Escape先关闭候选，再退出到正文并保留草稿。目录内的Escape收起目录，拖动时仅取消本次调宽。
- **目录快捷键**：`site/assets/js/sidebar-shortcuts.js` 统一处理 `Ctrl+Alt+A`（左侧内容目录）和 `Ctrl+Alt+B`（本页目录）。help正文在“操作”后独立显示“侧栏快捷键”组，两行分别为“Ctrl+Alt+A 显示/隐藏左侧目录”“Ctrl+Alt+B 显示/隐藏右侧目录”；使用可换行的两列dl，不占用命令与数字的三列结构。底部紧凑区只保留原有六条编辑快捷键，其他界面继续称“本页目录”。命令输入模式允许使用并保留草稿，不执行命令，不主动改写hash或滚动位置。忽略IME组合输入、AltGr、重复按键及其他input/textarea/select/contenteditable等编辑区；无可用本页目录时B不处理。手机左抽屉仍遵循既有inert和焦点规则。
- **分区概览与全文**：summaries.js生成h2栏目标题、常驻paths.description和最近列表，最多10条，日期与标题复用统一索引。经历在最近列表前常驻简历行：有PDF为链接，无PDF为“PDF待添加”。native details首次展开或open时才创建全栏正文；只隐藏最近列表，标题、说明和简历行持续可见。收起恢复概览并保留已建正文。正文不再重复栏目说明、PDF入口或首页about/身份/兴趣；真实resume.sections仍在经历全文中。关闭或导航暂停视频，媒体图注ID唯一。
- **会话与阅读**：屏幕只保留当前页面与唯一输入区，命令历史仍可↑↓回调实际输入；数字和中文简写执行后统一回显英文规范命令，如2为resume。键盘栏目命令替换页面并置顶，未知命令不清屏；侧栏及帮助的浏览按钮清会话，聚焦正文并从顶部阅读，避免唤起手机输入。home回首页。open展开当前分区全部正文并定位阅读起点，命令模式中继续保留输入焦点；close或/回输入。
- **首页与概览数据**：name用于品牌，首页展示greeting、role、interests和about；role只填“学生”，职业标签由UI添加且使用与关注行一致的普通次要文字色，关注行按主区剩余宽度排布，about保持可读限宽。顶层description已删除，不再生成description meta。paths只保留description，原introduction合并删除。life/resume/project展示常驻说明和最多10条更新日期优先的最近内容；左侧仍是全量，界面不显示媒体数量。help正文依次显示“浏览路线”“操作”和“侧栏快捷键”，底部仅保留六条编辑快捷键；文章数据由构建器生成，命令来自commands.js。
- **内容**：站点资料在content/site.yml，每篇在content/entries/{key}/index.md，媒体随篇保存，归属由sections决定。Markdown可混写常见HTML；经HTML语法树转换为统一标题、链接、列表、表格及媒体结构，不直接输出任意HTML。脚本及不支持的标签显示为文本，事件属性丢弃，代码示例保持原样。HTML和Markdown共用分隔符及绝对路径转换，旧机器路径可按content/entries/{key}/定位本篇素材，最终真实文件仍限定在本篇目录。图片与MP4分别生成图片和视频，同名.poster.*与.zh.vtt作为封面/字幕；未引用素材不展示。HTML图片支持受控width与zoom参数，图注居中。元信息与生成数据不含example/dateExample；不预置示例文章或素材，实际内容由作者维护。替换媒体同步alt、图注、封面与字幕。
- **图片预览**：`site/assets/js/image-viewer.js` 与 `site/assets/css/image-viewer.css` 提供同页居中预览，保持原比例并适应可见区域，小图不强行放大，底部图注居中。仅使用暗背景与右上角×关闭入口，`Esc`或图片外空白也可关闭；关闭后焦点回原图且保留原滚动位置。预览内Esc优先关闭图片，不触发背后命令模式。`Ctrl`/`Meta`/`Shift`点击保留原图外链，无法使用同页预览时沿用链接；视频仍为原生控件，不增加轮播或滚轮缩放。
- **图片对比**：`:::compare` 接受恰好两张 Markdown 或 HTML 图片，共用既有路径校验、素材复制及版本化；代码围栏内不识别。第一张的受控 width/zoom 决定正文显示大小，首图自然比例决定共同画布，两图 object-fit:contain，不拉伸、不自动裁剪。使用本地固定版本 img-comparison-slider，主题沿用本站颜色与字体，支持鼠标、触摸、键盘方向键及两侧标签。“放大对比”复用原生灯箱，在可见舞台内等比显示比较画布，关闭后恢复阅读位置与触发按钮焦点。组件来源、版本与许可记录在 README 及 vendor 目录。
- **主题与焦点**：模式组内两个原生按钮支持Tab、Enter和Space，aria-pressed与页面同步，只有主动选择才保存；按钮/链接焦点为2px强调轮廓；正文偏移5px，模式按钮、目录控件、条目与分隔柄使用内侧轮廓。
- **控件选择与鼠标焦点**：按钮、原生summary、工具栏、目录和帮助快捷键文字使用user-select:none，正文与输入继续可选择复制。仅鼠标主键按下按钮时阻止默认获焦，click仍执行；保留键盘Tab及Enter/Space、触摸、链接、原生details和媒体行为，不移除tabindex或全局隐藏焦点。

## Do's and Don'ts

### Do

- **Do** 遵从最新图示，让页面铺满视口并与背景融合。
- **Do** 区分桌面展开/折叠与手机抽屉，保留本次会话的桌面选择及宽度，保证调宽边界和焦点稳定。
- **Do** 保留原生输入、↑↓命令历史、Tab规则与现有内容真实性。
- **Do** 先显示内容标题预览，按需创建详情；展开后保留唯一栏目标题，并在阅读历史时暂停跟随。

### Don't

- **Don't** 恢复限宽居中、外框、内框、套窗内缩或页面背景分层。
- **Don't** 恢复悬停peek、图钉固定、延迟收起，或将目录偏好写入localStorage。
- **Don't** 恢复独立站点指南、版权条或执行箭头。
- **Don't** 初始创建全部富文媒体，或在阅读期间强行滚回新提示符。

## 自动吸附与命令模式

`site/assets/js/command-input.js` 与 `site/assets/css/command-input.css` 永久启用这套唯一输入体验，通过 `LIZPINK_INPUT` 与页面命令逻辑协作。唯一命令区在初始化时移到 `.frame-main`，原位保留等高占位；之后只更新位置，不重挂节点。自动吸附通过原位占位与滚动视窗比较位置，在原位完整可见时回流。两态使用同一宽度、内边距和透明边线占位，避免安全区与反馈换行改变切换前后的占位高度。

滚动与观察器触发的定位请求合并到同一个requestAnimationFrame；命令执行和模式切换继续支持同步refresh。定位只在CSS变量或尺寸改变时写入样式，一轮内复用命令区高度及原位坐标，减少滚动热路径的重复布局计算。

补全候选依据上下剩余空间选择展开方向并限高；手机使用 VisualViewport 高度和底部安全区。版本切换栏、对比页、固定输入分支和普通流回退分支已移除。旧链接中的 `input` 参数清除后使用最终版本，保留主题参数与栏目位置。

命令模式独立存储当前激活状态。首次打开首页通过focusInitial()调用input.focus({preventScroll:true})，仅初始化时自动聚焦；空会话保留原位，有输出后编辑模式停靠底部。未激活使用静态空心光标，空输入旁显示“按下 / 输入命令 · 输入 help 查询命令”，窄屏分行；激活且空输入时显示非交互的“输入 help 查询命令”，开始输入后隐藏。只有input真正聚焦、document有焦点且页面可见时光标实心闪烁；失焦转为空心静态，窗口恢复不抢焦点。Esc先关闭候选，再返回正文并保留草稿；右侧按钮可直接返回阅读。组合输入、其他编辑区、文字选择、媒体与目录上下文不触发快捷唤起。

## 内容源码、构建与发布

Markdown内容与本页目录已并入main，按以下正式维护流程更新；线上状态以对应 GitHub Actions 任务结果为准。

- 作者内容：`content/site.yml` 维护品牌、简介、简历与栏目；`content/entries/{key}/index.md` 及同文件夹媒体维护每篇正文；`content/files/` 放公共文件。具体写法见[内容维护](CONTENT.md)。
- UI源码：`site/index.html` 与 `site/assets/` 维护模板、交互、主题和字体。`dist/` 为生成目录，已gitignore，不手改或作为源文件提交。
- 内容构建：`scripts/build-content.mjs` 解析YAML/Markdown、引用媒体与h2/h3目录，生成浏览器数据与媒体资源。
- 日期生成：`scripts/content-dates.mjs` 读取完整Git历史，计算各篇目录后续内容提交的北京时间日期；手填updatedAt优先，首次创建或历史不可用时回退publishedAt，不写回源文件。
- 整站构建：`scripts/build.mjs` 在暂存区复制site、生成内容并替换站点字段，成功后以目录重命名切换dist。`scripts/build-files.mjs` 对目录切换、回退和构建锁删除中的EPERM/EACCES/EBUSY最多重试8次，按50ms递增等待，单项最多等待1.8秒；递归清理使用Node的有限重试。失败时恢复旧网站，回退也失败时保留备份并报告路径；清理出错仍尝试释放构建锁。`npm run build` 执行完整流程。
- 本地预览：`npm run dev` 默认4182端口，监听content/site，重建成功后自动刷新浏览器；不监听.git，提交后需运行 `npm run build` 并刷新浏览器，或重新启动预览，读取新日期。
- 完整检查：`npm test` 先构建，再运行全部tests，不能用只检查旧dist代替。

`.github/workflows/deploy-pages.yml` 仅在main发布：推送main后先执行 `npm ci`，再执行包含构建的 `npm test`，通过后上传并部署dist。功能分支用于开发预览，不自动更新线上；最终状态以对应 GitHub Actions 任务结果为准。历史版本通过Git提交查看。

## 检查清单

修改相关功能后，按以下项目核对：

- **首页与导航**：点击目录、输入命令和浏览器前后导航均切换到正确栏目；greeting、role、interests和about只在home显示，顶层description及对应meta均已删除；职业标签由UI添加，职业行与关注同为var(--muted)非accent；关注行在实际空间不足时才换行，about可读限宽保持；home恢复完整首页，初始自动聚焦输入保持。
- **内容目录**：桌面默认展开，工具栏始终可用；拖动、左右16px、Home/End、双击200px、Esc取消拖动正确，范围180–420px且主区至少320px；会话偏好跨断点保留，每次进入手机先关闭。
- **单条与日期**：栏目筛选、home/help去重并集、有效更新日期优先降序、否则publishedAt、同日稳定顺序、无日期置后及当前条目标识正确；分区标签与链接归属一致。单条深链及前后导航一致，只创建所选媒体，open/close无详情提示正确。正文始终有“创建于”“更新于”两项，创建项使用publishedAt；更新项依次采用手填updatedAt、整篇目录后续内容提交日期、创建日期。首次创建时两项相同，正文或素材后续提交按北京时间更新；未提交、仅构建、修改其他文章不刷新日期；Git缺失/历史不完整回退创建日期。手填日历日不转换时区，仅Git时间戳转换；缺失项为“—”，仅有效日期生成time，不写回Markdown、不使用文件修改时间；无日期不补造，不渲染示例徽标；空内容目录下仍显示栏目说明与简洁空态，不生成占位文章。
- **命令与会话**：Enter执行、数字别名、Tab补全、↑↓历史和错字建议正常；Esc按顺序关闭补全、返回阅读并保留草稿；依次输入1、2、3及重复输入同栏目后仅保留当前输出，main.scrollTop为0且焦点仍在输入；未知命令不清屏；clear不再识别，数字命令回显英文，成功补全底部反馈为空。
- **分区概览与简历**：有0、少于10条及超过10条时只展示实际的最近最多10条，日期与左栏一致；简介常驻，open/close切换全文/概览后标题、description、简历行不隐藏或重复。有PDF可打开，无PDF显示“PDF待添加”；经历全文保留正式sections，不重复首页资料或PDF入口。
- **阅读与详情**：展开/收起、open/close、直达栏目和输入区吸附定位正常；阅读历史时不强制滚到底部，关闭详情后暂停其中的视频。普通图片点击为同页预览，Esc/×/空白关闭后回原图与原滚动；修饰点击保留外链，视频不进入图片预览，手机关闭入口可见。
- **响应式与主题**：核对桌面、390px和320px宽度，两种主题均可读；页面无横向溢出，输入与候选列表保持在可见区域。
- **键盘与动态效果**：目录焦点、手机抽屉Tab循环、Escape焦点返回和跳到正文正常；Ctrl+Alt+A/B切换对应目录，命令草稿保留，hash和主动阅读位置不变；IME、AltGr及其他编辑区不触发，无有效目录时B不处理。系统减少动态效果设置生效。
- **流式展示**：摘要与帮助按完整行出现，连续提交、返回阅读或上翻立即完整；初始/历史导航不重播，短视口不出现等待空白，输入和阅读位置稳定。模块生命周期检查：`node --test tests/output-motion.test.cjs`。
- **内容与发布**：本地资源和文档链接有效，图片alt、媒体图注与字幕随内容更新；无旧example/dateExample字段，演示用途由正文说明。npm run build生成的dist无未替换占位，构建失败不发布半成品；合并发布后检查对应GitHub Actions任务结果。
- **Markdown与本页目录**：验证含HTML/Markdown图片、链接、列表和代码示例的内容，分区不显示媒体数量；支持标签按结构渲染，脚本及不支持标签显示为文本。覆盖两种分隔符、文章内绝对路径、跨机器路径后缀、资源边界及深链。两个以上文章h2/h3生成目录，最近10篇标题不收录；主区1000px阈值、右列180px、宽屏隐藏释放列、窄屏summary保留、当前章节和不改hash的main内跳转正确；手动显隐跨文章/宽窄保留，刷新恢复默认；关闭输入或媒体加载后不遮挡目录。
- **手机输入**：涉及输入区修改时，另用实体手机核对软键盘与中文输入法组合输入。
- **交互回归检查**：运行 `npm test`，先构建并执行全部tests，覆盖内容生成、命令、索引、目录与流式生命周期；核对桌面、390px、320px及两主题，文章文字铺满自身正文列且左对齐，不侵入本页目录；首页about与栏目概览仍保持原有阅读行宽。媒体在正文列内居中、最大960px，图注在与图片相同的figure宽度内居中。手机焦点循环含条目；推送main后检查对应发布任务。
