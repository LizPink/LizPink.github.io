---
name: LizPink 个人终端
description: 满视口统一背景、四入口侧栏与有限终端会话
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
  menu-pin:
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

保留 `lp_` 与 LizPink 并排及右侧主题开关。侧栏依次为首页、生活与记录01、经历与能力02、研究与探索03，每次载入默认收起；左缘临时展开，“目录”旁图钉固定。自介、Student与四兴趣并入经历与能力，完整介绍在展开详情中。首页保持问候和末句提示，其中“左侧目录”和help可直接点击。原生命令、五条会话与Tab补全延续，8个公开命令统一由commands.js管理；当前版本已于2026-10-25发布至 lizpink.github.io。

侧栏导航先用最多三条内容标题预览确认内容，富文和媒体按需展开；初次直接打开有详情的栏目链接时展开详情。展开时隐藏预览、保留唯一栏目标题，减少重复介绍。阅读历史或展开详情时暂停跟随，不强拉到底；输入采用自动吸附与命令模式。

**Key Characteristics:**

- 满视口、统一背景、零套窗内缩。
- 默认收起的四入口侧栏、左缘临时展开与图钉固定。
- 关闭、固定、临时预览、手机抽屉四态。
- 短摘要与按需详情，自动跟随与阅读保护。
- 唯一自动吸附输入，命令模式固定底部，退出保留草稿。

## Colors

frontmatter 记录当前组件使用的18个颜色；运行来源为 `dist/assets/css/styles.css`，不改变既有主题。

### Primary

强调色用于标志、提示符、块光标、链接与当前菜单；柔和强调底色用于滑块、代码和候选。亮文字直接对比深色背景，不为全部文字添加光晕。

### Neutral

`screen` 是页面、工具栏、侧栏、框架和主区的统一底色。`text` 与 `muted` 承担正文和说明；两级线色用于内部细分隔及控件。`bg` 保留在标志镂空文字、选择和遮罩等局部，`chrome` 仅用于主题开关轨道，不形成页面分层。

**The Two Themes Rule.** 默认琥珀，另有荧绿；一个两档switch及当前名称，checked表示荧绿。有效URL优先于有效保存偏好，再回退琥珀；只有手动切换开关保存，已有参数同步且保留hash。成功切换仅通过开关状态、当前主题名称与页面颜色反馈；`theme` 不列入帮助和补全，输入旧命令提示使用右上角开关。

## Typography

标题、中文说明、摘要与界面使用本地Source Serif 4及中文系统衬线回退；命令输入、回显、路径和快捷键使用本地IBM Plex Mono。终端正文16px、行高1.7；输入和回显16px、行高1.6。

默认摘要16px衬线、400字重、行高1.7，栏目标题使用h2、26px、500字重、行高1.4；摘要最长72ch，类型数量以13px次要文字呈现。事实标签与值分列，480px及以下改为上下排列。详情使用17px衬线、行高1.9，分节标题为h3、经历条目为h4，不再重复栏目标题。侧栏“目录”标题与“首页”等菜单项同用16px衬线、行高1.5；编号仍为12px等宽。帮助中的命令使用15px、500字重等宽，中文解释使用16px衬线、行高1.5；命令列固定8ch，“或N”独立对齐，使用CSS Grid而非制表符。命令按钮最小高度44px，组间距16px。

衬线字体为 `dist/assets/fonts/SourceSerif4Variable-Roman.ttf.woff2`，常规体字重200–900、自动光学字号。IBM Plex Mono来自 [IBM官方仓库](https://github.com/IBM/plex)，本地文件为 `dist/assets/fonts/IBMPlexMono-Regular.woff2`（400）与 `dist/assets/fonts/IBMPlexMono-Medium.woff2`（500），等宽回退为Cascadia Mono、Consolas、Microsoft YaHei、monospace。三份字体均使用 `font-display:swap`；预加载Source Serif 4与IBM Regular。许可分别见 `dist/assets/fonts/LICENSE.md` 和 `dist/assets/fonts/IBM-Plex-Mono-LICENSE.txt`（SIL OFL 1.1）。中文依次回退Noto Serif SC、Source Han Serif SC、Songti SC、SimSun、serif，未打包中文字体。

首页问候38px、栏目标题26px，760px以下为30px与24px，360px以下问候28px。图文条目标题23px，760px以下21px。标志保留既有Cascadia Code等宽栈：32px方块、18px字、字距-2px，姓名24px衬线；手机为28px方块、16px字与22px姓名。

## Layout

`.site-shell`宽100%、高100dvh（回退100vh），margin与padding均为0。框架、主区外框和套窗内缩均为0。工具栏最小高度52px、内边距 `3px 16px`；桌面图钉与手机关闭按钮位于侧栏“目录”标题旁，不占工具栏。

**滚动边界：** html、body、site-shell、terminal-frame、frame-layout、frame-main统一使用 `overflow:clip`，防止焦点或程序滚动带动外层；内容滚动只改变main的 `scrollTop`，main保持 `overflow:auto`。详情定位使用 `scrollWithinTerminal`，按目标相对main的顶部差减24px调整；执行新浏览命令后通过动画帧跟随新输出。`/` 聚焦与退出命令模式使用 `preventScroll` 保留阅读位置，不调用 `scrollIntoView` 滚动祖先容器。

固定展开时侧栏208px，1000px以下196px；收起后主区使用全宽。主区独立滚动，内边距 `24px 32px`，1000px以下水平28px。临时预览侧栏以absolute覆盖主区，主内容坐标不变。桌面左缘重新展开入口宽20px、贯穿内容区高度，中部显示chevron。

760px以下侧栏为宽 `min(268px,84%)` 的左侧抽屉，隐藏图钉并显示关闭按钮。左缘入口改为44×44px，位于左侧中部，不遮顶部文字；主区内边距 `24px 20px`，目录关闭时左内边距44px给入口留位。工具栏隐藏路径、主题名称；1000px以下隐藏状态。输入行最小48px，右侧为最小44px高的命令模式控件，输入占据剩余宽度；记录间距24px、手机20px，回显下方8px；事实标签列宽60px、手机52px，480px及以下改为单列上下排列。会话最多五条。

原生details展开行最小高度44px，正文与展开行相距16px。详情和媒体左对齐、最大960px，段落最大72ch；限宽仅用于阅读内容，页面框架仍使用全宽。图片可点击后在新标签页打开原图，图下注明操作。命令区在frame-main内定位，原位保留等高占位；原位不可见或命令模式激活时停靠底部，退出命令模式且原位可见时回流。独立“返回输入”控件已移除。

### 目录状态

| 状态 | 布局与触发 | 退出 |
| --- | --- | --- |
| `closed` | 每次载入的默认状态，可见左缘按钮和首页文字入口 | 点击首页“左侧目录”打开并聚焦当前栏目；桌面左缘悬停、点击或键盘激活进入临时展开；手机激活打开抽屉 |
| `pinned` | 点击“目录”旁图钉固定，侧栏占网格列；`aria-pressed=true` | 再点图钉取消固定并转临时展开；跨导航保持 |
| `peek` | 桌面临时展开，absolute覆盖，不移动主区 | 图钉可固定；移出180ms后关闭，键盘焦点留在目录内或仍悬停时保留；Escape关闭 |
| `mobile-open` | 手机抽屉、遮罩、主区inert和焦点循环 | 选择后聚焦内容；关闭按钮、Escape或遮罩关闭后回仍可见的触发按钮 |

每次状态切换清理旧关闭计时器；仅peek安排延迟关闭。首页文字入口与左缘入口同步 `aria-expanded`；Escape关闭后回到触发入口，入口已隐藏时回退左缘按钮。跨760px进入手机时关闭抽屉，返回桌面时沿用本次会话的固定选择；刷新不记忆固定状态。

### 跟随与阅读

默认跟随新输出，ResizeObserver观察记录、命令区和主区，合并到动画帧。执行新浏览命令后滚动到新输出；阅读或命令模式中的聚焦、编辑、Tab和↑↓保持正文位置。补全候选依据命令区上下空间选择展开方向并限高，列表可以独立滚动。

向上滚轮、触摸移动、滚动键、拖动滚动条、聚焦历史记录或展开详情暂停跟随；阅读期间内容增长不强拉到底。手动滑回距底部32px内可恢复。

## Elevation & Depth

页面与背景相融，不用阴影、扫描线或额外窗框。桌面peek与手机抽屉用层级覆盖；手机遮罩不透明度.7。

首次屏幕显像340ms、输出显现150ms、块光标950ms、主题滑块180ms；桌面peek滑入160ms、手机抽屉200ms。系统减少动态效果关闭动画与位移；标签页隐藏暂停光标闪烁。状态直接跟随输入，不模拟等待。

## Shapes

页面与内容为方角，内部采用细线。“目录”旁图钉为44px点击区、20px图标，以 `aria-pressed`、动态名称及图标状态表达固定/取消固定；手机在同处显示44px关闭按钮。左缘入口保留可见焦点，桌面轮廓向内偏移避免被屏幕边界裁切。

主题开关78×44px，轨道圆角18px，滑块30×22px、圆角13px、横移40px；色点9px。块光标宽.65ch、高1.1em。输入无底线、无独立执行箭头；命令模式用柔和强调底色和细分隔线表达激活状态。

详情采用原生details/summary与CSS细chevron，关闭时向右、展开时向下；不增加额外卡片外壳。

## Components

- **导航与命令**：侧栏及路线数据依次为home、life、resume、research。8个公开命令为home/0、life/1、resume/2、research/3、open、close、clear、help；commands.js的单一命令表派生解析路由、Tab候选、可点击帮助和错字建议。错误建议比较完整拼写，支持相邻字母交换，例如reserch建议research。视图只保留上述四项与help。原项目、档案、联系路由及数字4/5、相关别名删除，旧无效hash回home，旧命令未识别；about/info等个人介绍别名仍转resume。
- **输入**：真实input处理编辑、选区和中文输入，镜像层只画块光标；Enter隐式提交，手机发送键。`/`、点击输入或“/ 输入命令”进入命令模式；同一行控件变为“Esc 返回阅读”，退出时保留草稿。点击正文不触发输入聚焦，初始不自动聚焦。
- **Tab**：非Shift Tab保持输入焦点，唯一匹配补全、多匹配循环、空输入可用、无匹配不跳焦；候选listbox/option关联combobox。Shift+Tab离开，↑↓调历史；Escape先关闭候选，再退出到正文并保留草稿。菜单中的Escape关闭未固定目录或手机抽屉。
- **摘要与详情**：summaries.js生成h2栏目标题及summary-overview预览，native details首次展开、open命令或首次直达有详情栏目时才创建完整介绍、图片和视频。展开时隐藏预览、保留栏目标题；收起时恢复预览并保留已建正文。详情不重复栏目标题、身份和兴趣标签；完整自介只渲染一次。示例标识放在条目h3旁，不再添加全局示例提示。关闭或后续命令暂停视频，媒体图注ID每次唯一。
- **会话与阅读**：最多五条真实回显/摘要及唯一新prompt。键盘提交跟随新输出，手动阅读暂停；侧栏及帮助的浏览按钮清会话，聚焦正文并从顶部阅读，避免唤起手机输入。home/clear回首页。open展开最近记录详情并定位阅读起点，命令模式中继续保留输入焦点；close或/回输入。
- **摘要数据**：经历展示Student、兴趣、履历/PDF状态及最多三条内容标题；研究/生活展示最多三条内容标题，类型数量作为次要信息。预览中的示例逐项标注，介绍只在详情出现。help直接显示“浏览路线、操作”两组平面命令按钮与快捷键，无折叠层；数据只取自content.js。
- **内容**：保留简历/PDF与三路线的文字、图片和视频示例；原项目、档案和联系内容、渲染器、摘要及专用CSS均删除，不迁入life。替换媒体同步alt、图注、封面与字幕；example:false只去外部标识。
- **主题与焦点**：保持单switch语义、保存规则和动态状态；按钮/链接焦点为2px强调轮廓、偏移5px，左缘按钮为1px内侧轮廓。

## Do's and Don'ts

### Do

- **Do** 遵从最新图示，让页面铺满视口并与背景融合。
- **Do** 明确区分closed、pinned、peek和mobile-open，保证焦点、计时器及覆盖布局稳定。
- **Do** 保留原生输入、五条会话、Tab规则与现有内容真实性。
- **Do** 先显示内容标题预览，按需创建详情；展开后保留唯一栏目标题，并在阅读历史时暂停跟随。

### Don't

- **Don't** 恢复限宽居中、外框、内框、套窗内缩或页面背景分层。
- **Don't** 将临时peek当固定目录推动主内容，或让旧计时器关闭已固定的目录。
- **Don't** 恢复独立站点指南、版权条、侧栏次级链接或执行箭头。
- **Don't** 初始创建全部富文媒体，或在阅读期间强行滚回新提示符。

## 自动吸附与命令模式

`dist/assets/js/command-input.js` 与 `dist/assets/css/command-input.css` 永久启用这套唯一输入体验，通过 `LIZPINK_INPUT` 与页面命令逻辑协作。唯一命令区在初始化时移到 `.frame-main`，原位保留等高占位；之后只更新位置，不重挂节点。自动吸附通过原位占位与滚动视窗比较位置，在原位完整可见时回流。两态使用同一宽度、内边距和透明/可见边线，避免安全区与反馈换行改变切换前后的占位高度。

补全候选依据上下剩余空间选择展开方向并限高；手机使用 VisualViewport 高度和底部安全区。版本切换栏、对比页、固定输入分支和普通流回退分支已移除。旧链接中的 `input` 参数清除后使用最终版本，保留主题参数与栏目位置。

命令模式独立存储当前激活状态。按 `/`、点击输入或“/ 输入命令”进入；同一输入行右侧的控件变为“Esc 返回阅读”，分隔线与编辑区域强调当前状态。输入期间保持底部停靠，执行后继续可输入；滚动不改变草稿与焦点。`Esc` 先关闭候选，再退出到正文，保留草稿与阅读位置；按钮可直接返回阅读。初始不进入命令模式。组合输入、其他编辑区、文字选择、媒体与目录上下文不触发快捷唤起。

## Verification

以下为历史版本检查摘要；原始记录见 [interaction-history.json](verification/interaction-history.json)，其中截图文件名对应 `docs/previews/`。当前使用与维护入口见[项目 README](../README.md)，整理前的完整说明见[旧版 README](archive/README-2026-10-25.md)。

2026-10-25前期自动吸附与命令模式检查覆盖桌面、390×844与320×640视口：展开/收起、正文滚动、中文草稿保留、Tab补全、历史回调、命令执行与两主题。吸附回流前后占位与命令区等高，输入不移除焦点；没有站点脚本错误，浏览器Zotero扩展曾报告连接错误。实体手机软键盘和输入法组合过程尚未专项验证。

2026-10-25入口与阅读优化已通过1661px桌面、390×844和320×640手机视口核对：文字目录与Escape焦点返回、可点击帮助、点击后从正文顶部阅读、键位提示与Tab/Shift+Tab、reserch纠错、摘要/详情单一标题和按需媒体均正常。桌面媒体宽960px、段落约630px，已检查页面无横向溢出，浏览器error/warn为0。示例内容与待补简历保持原状态；本轮未做屏幕阅读器或实体手机软键盘专项测试。
