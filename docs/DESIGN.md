---
name: LizPink 个人终端
description: 满视口统一背景、可调内容目录、Markdown单条阅读与终端交互
colors:
  amber-bg: "#151812"
  amber-chrome: "#20231c"
  amber-screen: "#080a08"
  amber-text: "#e9dcc0"
  amber-muted: "#a99f89"
  amber-accent: "#e6bc76"
  amber-accent-soft: "#292719"
  amber-line: "#454b3c"
  amber-line-soft: "#30372c"
  green-bg: "#0b100d"
  green-chrome: "#121714"
  green-screen: "#020503"
  green-text: "#c3f3b9"
  green-muted: "#8eae89"
  green-accent: "#9ff279"
  green-accent-soft: "#17291a"
  green-line: "#34523b"
  green-line-soft: "#203928"
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
    fontFamily: '"Source Serif 4", "Noto Serif SC", "Source Han Serif SC", "Songti SC", SimSun, serif'
    fontSize: "17px"
    lineHeight: 1.9
  screen:
    fontFamily: '"Source Serif 4", "Noto Serif SC", "Source Han Serif SC", "Songti SC", SimSun, serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  menu:
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
    fontFamily: '"Source Serif 4", "Noto Serif SC", "Source Han Serif SC", "Songti SC", SimSun, serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  details:
    fontFamily: '"Source Serif 4", "Noto Serif SC", "Source Han Serif SC", "Songti SC", SimSun, serif'
    fontSize: "17px"
    lineHeight: 1.9
rounded:
  square: "0"
  switch-track: "18px"
  switch-thumb: "13px"
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
    backgroundColor: "{colors.amber-accent}"
    textColor: "{colors.amber-bg}"
    width: "32px"
    height: "32px"
  theme-track:
    backgroundColor: "{colors.amber-chrome}"
    rounded: "{rounded.switch-track}"
    width: "78px"
    height: "44px"
  theme-thumb:
    backgroundColor: "{colors.amber-accent-soft}"
    rounded: "{rounded.switch-thumb}"
    width: "30px"
    height: "22px"
  menu-item:
    backgroundColor: "transparent"
    textColor: "{colors.amber-muted}"
    padding: "10px 12px"
  menu-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.amber-muted}"
    width: "44px"
    height: "44px"
  command-input:
    backgroundColor: "transparent"
    textColor: "{colors.amber-text}"
    padding: "11px 1ch 11px 0"
  details-summary:
    textColor: "{colors.amber-accent}"
    padding: "8px 0"
    height: "44px"
---

# Design System: LizPink 个人终端

## Overview

文中的文件路径均以项目根目录为基准。

**Creative North Star: "融入背景的个人终端"**

用户图示与最新明确修订是最高优先约束。网页铺满视口，页面、工具栏、侧栏、框架和主区共用屏幕底色；不使用居中限宽、外框、主区内框或套窗内缩。仅内部工具栏与侧栏保留细分隔线。

保留lp_与LizPink并排及主题开关。工具栏目录入口始终可见，桌面目录默认展开、可折叠调宽，手机使用抽屉；顶部为首页、生活01、经历02、项目03，下方为内容索引。自介仍在经历详情，首页问候、命令输入、↑↓命令历史与7个命令保持；每次栏目切换替换旧输出并置顶。当前线上 `main` 为 `c83717a` 日期侧栏版。本文的内容源码分离、Markdown正文和本页目录属于 `codex/markdown-content` 开发分支，尚未作为本轮改动发布到线上；发布状态另以合并及对应 GitHub Actions 任务结果为准。

侧栏导航先用最多三条内容标题预览确认内容，富文和媒体按需展开；初次直接打开有详情的栏目链接时展开详情。展开时隐藏预览、保留唯一栏目标题，减少重复介绍。阅读历史或展开详情时暂停跟随，不强拉到底；输入采用自动吸附与命令模式。

**Key Characteristics:**

- 满视口、统一背景、零套窗内缩。
- 桌面默认展开、可折叠调宽的内容目录，手机使用抽屉。
- 四个纵向栏目入口、日期标题索引与单条深链接阅读。
- 短摘要与按需详情，自动跟随与阅读保护。
- 唯一自动吸附输入，命令模式固定底部，退出保留草稿。

## Colors

frontmatter 记录当前组件使用的18个颜色；运行来源为 `site/assets/css/styles.css`，不改变既有主题。

### Primary

强调色用于标志、提示符、块光标、链接与当前菜单；柔和强调底色用于滑块、代码和候选。亮文字直接对比深色背景，不为全部文字添加光晕。

### Neutral

`screen` 是页面、工具栏、侧栏、框架和主区的统一底色。`text` 与 `muted` 承担正文和说明；两级线色用于内部细分隔及控件。`bg` 保留在标志镂空文字、选择和遮罩等局部，`chrome` 仅用于主题开关轨道，不形成页面分层。

**The Two Themes Rule.** 默认琥珀，另有荧绿；一个两档switch及当前名称，checked表示荧绿。有效URL优先于有效保存偏好，再回退琥珀；只有手动切换开关保存，已有参数同步且保留hash。成功切换仅通过开关状态、当前主题名称与页面颜色反馈；`theme` 不列入帮助和补全，输入旧命令提示使用右上角开关。

## Typography

标题、中文说明、摘要与界面使用本地Source Serif 4及中文系统衬线回退；命令输入、回显、路径和快捷键使用本地IBM Plex Mono。终端正文16px、行高1.7；输入和回显16px、行高1.6。

默认摘要16px衬线、400字重、行高1.7，栏目标题使用h2、26px、500字重、行高1.4；摘要最长72ch，实际图片、视频和纯文字条目数量以13px次要文字呈现。事实标签与值分列，480px及以下改为上下排列。详情使用17px衬线、行高1.9，分节标题为h3、经历条目为h4，不再重复栏目标题。Markdown源使用h2/h3章节，渲染时按文章所在层级调整。内容目录标题16px衬线、行高1.5；栏目按钮15px，条目标题17px，日期12px等宽，目录仅保留分区、日期和标题。帮助中的命令使用15px、500字重等宽，中文解释使用16px衬线、行高1.5；命令列固定8ch，“或N”独立对齐，使用CSS Grid而非制表符。命令按钮最小高度44px，组间距16px。

衬线字体为 `site/assets/fonts/SourceSerif4Variable-Roman.ttf.woff2`，常规体字重200–900、自动光学字号。IBM Plex Mono来自 [IBM官方仓库](https://github.com/IBM/plex)，本地文件为 `site/assets/fonts/IBMPlexMono-Regular.woff2`（400）与 `site/assets/fonts/IBMPlexMono-Medium.woff2`（500），等宽回退为Cascadia Mono、Consolas、Microsoft YaHei、monospace。三份字体均使用 `font-display:swap`；预加载Source Serif 4与IBM Regular。许可分别见 `site/assets/fonts/LICENSE.md` 和 `site/assets/fonts/IBM-Plex-Mono-LICENSE.txt`（SIL OFL 1.1）。中文依次回退Noto Serif SC、Source Han Serif SC、Songti SC、SimSun、serif，未打包中文字体。

首页问候38px、栏目标题26px，760px以下为30px与24px，360px以下问候28px。图文条目标题23px，760px以下21px。标志保留既有Cascadia Code等宽栈：32px方块、18px字、字距-2px，姓名24px衬线；手机为28px方块、16px字与22px姓名。

## Layout

`.site-shell`宽100%、高100dvh（回退100vh），margin与padding为0。框架及主区零套窗内缩。工具栏最小52px、内边距3px 16px，目录入口位于标志左侧且始终可见；目录内部另有收起按钮。

**滚动边界：** html、body、site-shell、terminal-frame、frame-layout、frame-main统一使用 `overflow:clip`，防止焦点或程序滚动带动外层；内容滚动只改变main的 `scrollTop`，main保持 `overflow:auto`。详情定位使用 `scrollWithinTerminal`，按目标相对main的顶部差减24px调整；执行新栏目命令时取消旧跟随帧，替换输出并将main.scrollTop归零；随后刷新输入区定位。`/` 聚焦与退出命令模式使用 `preventScroll` 保留阅读位置，不调用 `scrollIntoView` 滚动祖先容器。

桌面目录默认200px，占独立网格列；折叠后主区全宽。拖动separator可调180–420px，并给主内容至少320px；空间不足时夹取宽度。左右键每次16px，Home/End最小/最大，双击恢复200px，Escape取消拖动。主区独立滚动，内边距24px 32px，1000px以下水平28px。

760px以下目录为宽min(320px,90%)的左侧抽屉，不提供调宽分隔条，通过工具栏打开；主区内边距24px 20px。高度不超过540px时目录整体滚动，收起按钮所在标题行保持可见，避免四行栏目挤压内容列表。工具栏隐藏路径和主题名称，1000px以下隐藏状态。输入行最小48px，闲置提示及编辑态返回阅读按钮最小44px；窄屏帮助12px可换行。记录间距桌面24px、手机20px，事实标签480px以下上下排列，屏幕仅显示当前页面，↑↓仍可回调命令历史。

栏目details展开行最小44px，正文相距16px。详情及单条reader使用剩余主区；文字最大72ch且左对齐，媒体自身最大960px并在该主区居中，按自然比例显示，小媒体不放大。图片可在新标签页打开原图。命令区保留等高原位，原位不可见或有输出的命令模式停底，退出且原位可见时回流。

### 目录状态

| 状态 | 布局与触发 | 退出 |
| --- | --- | --- |
| 桌面展开 | 默认状态，占独立列，可调宽 | 工具栏、内部收起按钮或目录内Escape折叠；拖动时Escape仅取消拖动 |
| 桌面折叠 | 主区全宽，工具栏入口仍可见 | 工具栏展开并恢复会话宽度 |
| 手机关闭 | 每次进入手机模式的默认状态 | 工具栏打开抽屉 |
| 手机抽屉展开 | 遮罩、主区inert，焦点循环包含关闭、栏目与内容条目 | 选择后聚焦正文；关闭、Escape或遮罩后返回工具栏 |

工具栏同步aria-expanded。桌面选择和偏好宽度只存本次会话内存，跨导航及手机往返保留，不写localStorage，刷新恢复默认。取消图钉、悬停peek与延迟收起。

### 内容索引与单条阅读

顶部四个栏目自上而下每行一个，下方列表独立滚动。life/resume/project按Markdown元信息sections筛选，home/help显示生成内容的去重并集，共享条目以首次路径引用作为链接栏目。构建器生成各栏目的paths.items，作者不手工维护列表。目录按有效显示日期降序，无日期条目置后，同日采用生成结果的稳定顺序。每条首行为“分区 YYYY.MM.DD”，下方为标题，不渲染简介或类型标签；分区与链接所属栏目一致。原有排版示例的用途由自然正文说明，不再添加数据旗标或示例徽标。

content-index.js负责栏目归属、hash及日期。点击目录条目或摘要标题进入如#project/geometry的单条reader，深链及前后导航均显示所选全文，仅创建该条媒体。单条不含details，open/close提示没有可展开详情；栏目summary/details与7个命令照旧。

日期优先有效publishedAt，否则有效updatedAt；严格校验实际日历日，不做时区转换，无日期则省略。正文日期行统一为“日期 YYYY.MM.DD”，不再使用example/dateExample字段。六篇迁移内容保留演示日期，每篇正文第一段明确说明其排版用途及日期性质，不代表真实发表或更新时间。目录元信息采用6px横向间距，侧栏内容宽度不超过164px时缩为2px，日期不拆行。

### 本页目录

`site/assets/js/article-outline.js` 从构建得到的Markdown h2/h3标题元信息生成本页目录，仅在至少两个有效标题时创建；文章主标题不重复收录，h3在目录中缩进12px。左侧继续跨内容导航，右侧只定位当前正文内部结构。

主区 `.frame-main` 可用宽度达到1000px时，`site/assets/css/article-outline.css` 使用180px右列与32px间距，目录随main独立滚动吸附；更窄时改为正文顶部默认折叠的原生details。无足够标题时不显示目录或空提示。目录为同背景、14px辅助文字，无卡片和阴影；当前章节以强调色与1px左线标记。

点击章节先暂停自动跟随，关闭窄屏目录，再只修改main.scrollTop并聚焦目标标题；不改写现有内容hash或增加章节路由历史。目录最大高度扣除输入区与安全余量，媒体加载和主区尺寸变化后刷新位置；切换内容时清理观察器、监听与临时焦点属性。

### 跟随与阅读

每次新栏目命令都替换当前输出、取消旧跟随帧并置顶，输入继续可用。ResizeObserver观察记录、命令区和主区，阅读、编辑、Tab和↑↓保持正文位置，不把新页面拉到底部。补全候选依据命令区上下空间选择展开方向并限高，列表可以独立滚动。

向上滚轮、触摸移动、滚动键、拖动滚动条、聚焦历史记录或展开详情暂停跟随；阅读期间内容增长不强拉到底。手动滑回距底部32px内可恢复。

## Elevation & Depth

页面与背景相融，不用阴影、扫描线或额外窗框。桌面目录占独立列，手机抽屉层级覆盖，遮罩不透明度.7。

首页问候220ms淡入；命令回显100ms、输出180ms、详情展开160ms淡入；输入模式颜色和详情箭头140ms过渡，模式按钮文字颜色120ms。输出不再以clip-path裁切，也不移动正在被测量定位的正文或对输入位置添加过渡。首条输出贴齐主区顶部内边距，home之外的问候立即退出布局，键盘切换和目录导航均从顶部开始。块光标950ms、主题滑块180ms；目录宽度实时调整、手机抽屉200ms。系统减少动态效果关闭动画与位移；未激活使用静态空心光标；只有input聚焦、页面有焦点且可见时，实心编辑光标才闪烁。减少动态效果时保持实心静态。状态直接跟随输入，不模拟等待。

### 流式展示

`site/assets/js/output-motion.js` 只控制新结果的呈现。完整摘要或帮助DOM一次创建，命令回显立即出现，随后按完整行渐显；摘要最长280ms，帮助最长550ms。帮助中的命令、数字与解释同行出现，组标题与首行同时出现。只改变透明度，不逐字更新、不改变高度、不逐行滚动；长文与媒体继续按需展开。

仅用户执行命令或点击导航时播放；初次载入、浏览器前后导航不重播。结果连同输入区无法放进当前可见高度时跳过分行效果，避免手机或软键盘下先滚过尚未显示的内容。同一结果最多播放一次。

新命令、切换栏目、返回阅读、向上滚动、触摸阅读、滚动键、拖动滚动条、点击或聚焦正在显示的结果、选择文字都会立即完成当前展示。输入节点、草稿、焦点与选择不受动画控制。系统减少动态效果、隐藏页面、不支持动画或播放失败时直接显示完整内容；播放中切换偏好或隐藏页面也立即完成。动画结束清理效果与临时监听，旧动画的异步回调不能结束后续播放。

## Shapes

页面与内容方角、内部细线。工具栏入口与内部收起按钮最小44px，提供无障碍名称及状态；分隔条在悬停、聚焦或拖动时强调，目录控件和条目使用内侧焦点轮廓，避免裁切。

主题开关78×44px，轨道圆角18px，滑块30×22px、圆角13px、横移40px；色点9px。块光标宽.65ch、高1.1em。输入无底线、无独立执行箭头；命令模式用编辑区柔和强调底色表达激活状态，输入区顶部不显示分隔线。

详情采用原生details/summary与CSS细chevron，关闭时向右、展开时向下；不增加额外卡片外壳。

## Components

- **导航与命令**：侧栏及路线数据依次为home、life、resume、project。7个公开命令为home/0、life/1、resume/2、project/3、open、close、help；commands.js的单一命令表派生解析路由、Tab候选、可点击帮助和错字建议。错误建议比较完整拼写，支持相邻字母交换，例如proejct建议project。视图只保留上述四项与help。只保留现行命令、数字和当前中文简写；clear从解析执行、补全、帮助和建议中移除；open/close/help显示为展开/收起/帮助，并支持展开、收起中文输入。历史命令及旧路由不再兼容。无效hash显示home，未识别命令提示帮助。
- **输入**：真实input处理编辑、选区和中文输入，镜像层只画光标；Enter执行，手机发送键。首次首页完成初始化后自动聚焦，空会话输入保留在问候下方；内容深链保持阅读。未激活空输入显示静态空心光标及可点击的激活/帮助提示；激活空输入仅在光标旁显示“输入 help 查询命令”，键入后收起。右侧保留“Esc 返回阅读”，退出时保留草稿。隐藏说明通过aria-describedby为输入提供持续操作指导。
- **Tab**：非Shift Tab保持输入焦点，唯一匹配补全、多匹配循环、空输入可用、无匹配不跳焦；成功补全不显示底部状态文案，候选listbox/option及输入选区保留，错误说明不受影响。候选关联combobox。Shift+Tab离开，↑↓调历史；Escape先关闭候选，再退出到正文并保留草稿。目录内的Escape收起目录，拖动时仅取消本次调宽。
- **摘要与详情**：summaries.js生成h2栏目标题及summary-overview预览，native details首次展开、open命令或首次直达有详情栏目时才创建完整介绍、图片和视频。展开时隐藏预览、保留栏目标题；收起时恢复预览并保留已建正文。详情不重复栏目标题、身份和兴趣标签；完整自介只渲染一次。Markdown正文按需插入DOM，原示例说明在文章中保留，不再生成示例徽标。关闭或后续命令暂停视频，媒体图注ID每次唯一。
- **会话与阅读**：屏幕只保留当前页面与唯一输入区，命令历史仍可↑↓回调实际输入；数字和中文简写执行后统一回显英文规范命令，如2为resume。键盘栏目命令替换页面并置顶，未知命令不清屏；侧栏及帮助的浏览按钮清会话，聚焦正文并从顶部阅读，避免唤起手机输入。home回首页。open展开最近记录详情并定位阅读起点，命令模式中继续保留输入焦点；close或/回输入。
- **摘要数据**：经历展示Student、兴趣、履历/PDF状态及最多三条内容标题；项目/生活展示最多三条内容标题，次要数量分别累计mediaCounts.images、mediaCounts.videos，以及两者均为0的纯文字条目；一篇可以包含多种媒体。介绍只在详情出现，不添加示例标记。help直接显示“浏览路线、操作”两组平面命令按钮与快捷键，无折叠层；文章数据由构建器生成，命令来自commands.js。
- **内容**：站点资料在content/site.yml，每篇在content/entries/{key}/index.md，媒体随篇保存，归属由sections决定。构建时解析Markdown和媒体引用，图片与MP4分别生成图片和视频；同名.poster.*与.zh.vtt作为封面/字幕。原始HTML显示为文本，未引用素材不展示。元信息与生成数据不含example/dateExample；原示例用途及演示日期在正文第一段明确说明。替换媒体同步alt、图注、封面与字幕。此前移除的旧独立页面不恢复，也不迁入life。
- **主题与焦点**：保持单switch语义、保存规则和动态状态；按钮/链接焦点为2px强调轮廓；正文偏移5px，目录控件、条目与分隔柄使用内侧轮廓。
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

当前线上main为 `c83717a` 日期侧栏版，Markdown内容与本页目录在 `codex/markdown-content` 开发分支中体验；本分支尚未因文档更新自动发布。

- 作者内容：`content/site.yml` 维护品牌、简介、简历与栏目；`content/entries/{key}/index.md` 及同文件夹媒体维护每篇正文；`content/files/` 放公共文件。具体写法见[内容维护](CONTENT.md)。
- UI源码：`site/index.html` 与 `site/assets/` 维护模板、交互、主题和字体。`dist/` 为生成目录，已gitignore，不手改或作为源文件提交。
- 内容构建：`scripts/build-content.mjs` 解析YAML/Markdown、引用媒体、h2/h3目录和图片/视频计数，生成浏览器数据与媒体资源。
- 整站构建：`scripts/build.mjs` 在暂存区复制site、生成内容并替换站点字段，成功后原子替换dist。`npm run build` 执行完整流程。
- 本地预览：`npm run dev` 默认4182端口，监听content/site，重建成功后自动刷新浏览器。
- 完整检查：`npm test` 先构建，再运行全部tests，不能用只检查旧dist代替。

`.github/workflows/deploy-pages.yml` 在本分支中配置为仅main发布：先 `npm ci`，再 `npm test`，通过后上传并部署dist。功能分支用于开发预览，确认合并main并推送后才更新线上；最终状态以对应发布任务结果为准。历史版本通过Git提交查看。

## 检查清单

修改相关功能后，按以下项目核对：

- **首页与导航**：点击目录、输入命令和浏览器前后导航均切换到正确栏目；问候仅在home显示，home恢复首页。
- **内容目录**：桌面默认展开，工具栏始终可用；拖动、左右16px、Home/End、双击200px、Esc取消拖动正确，范围180–420px且主区至少320px；会话偏好跨断点保留，每次进入手机先关闭。
- **单条与日期**：栏目筛选、home/help去重并集、日期降序、同日稳定顺序、无日期置后及当前条目标识正确；分区标签与链接归属一致。单条深链及前后导航一致，只创建所选媒体，open/close无详情提示正确。正文日期行使用“日期”；迁移排版内容在正文第一段说明演示日期，无日期不补造，也不残留旧示例徽标。
- **命令与会话**：Enter执行、数字别名、Tab补全、↑↓历史和错字建议正常；Esc按顺序关闭补全、返回阅读并保留草稿；依次输入1、2、3及重复输入同栏目后仅保留当前输出，main.scrollTop为0且焦点仍在输入；未知命令不清屏；clear不再识别，数字命令回显英文，成功补全底部反馈为空。
- **阅读与详情**：展开/收起、open/close、直达栏目和输入区吸附定位正常；阅读历史时不强制滚到底部，关闭详情后暂停其中的视频。
- **响应式与主题**：核对桌面、390px和320px宽度，两种主题均可读；页面无横向溢出，输入与候选列表保持在可见区域。
- **键盘与动态效果**：目录焦点、手机抽屉Tab循环、Escape焦点返回和跳到正文正常；系统减少动态效果设置生效。
- **流式展示**：摘要与帮助按完整行出现，连续提交、返回阅读或上翻立即完整；初始/历史导航不重播，短视口不出现等待空白，输入和阅读位置稳定。模块生命周期检查：`node --test tests/output-motion.test.cjs`。
- **内容与发布**：本地资源和文档链接有效，图片alt、媒体图注与字幕随内容更新；无旧example/dateExample字段，演示用途由正文说明。npm run build生成的dist无未替换占位，构建失败不发布半成品；合并发布后检查对应GitHub Actions任务结果。
- **Markdown与本页目录**：验证一篇含图片/视频的内容、多媒体实际计数、原始HTML按文本显示、相对资源引用及深链。两个以上h2/h3生成目录；主区1000px阈值、右列180px、窄屏折叠、当前章节和不改hash的main内跳转正确；关闭输入或媒体加载后不遮挡目录。
- **手机输入**：涉及输入区修改时，另用实体手机核对软键盘与中文输入法组合输入。
- **交互回归检查**：运行 `npm test`，先构建并执行全部tests，覆盖内容生成、命令、索引、目录与流式生命周期；核对桌面、390px、320px及两主题，媒体在剩余主区居中、最大960px，文字最大72ch且左对齐。手机焦点循环含条目；推送main后检查对应发布任务。
