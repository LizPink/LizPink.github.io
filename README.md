# LizPink 个人终端

[在线访问](https://lizpink.github.io/) · [项目源码](https://github.com/LizPink/LizPink.github.io)

一个使用 HTML、CSS 和 JavaScript 编写的个人网站，网站基于 GPT-6.1 VibeCoding。

## 项目结构

```text
lizpink-terminal/
├── content/                   # 日常写作与素材
│   ├── site.yml               # 网站介绍、简历与栏目配置
│   └── entries/
│       └── geometry/          # 一篇内容一个文件夹
│           ├── index.md      # 标题、日期、分类和正文
│           └── demo-geometry.svg
├── site/                      # 页面、样式、交互及本地字体源码
├── scripts/                   # 内容解析、构建和本地预览
├── dist/                      # 自动生成的发布目录，不提交或手工编辑
├── tests/                     # 内容与交互检查
├── docs/                      # 维护、产品与设计说明
│   ├── CONTENT.md
│   ├── PRODUCT.md
│   └── DESIGN.md
├── .github/workflows/
│   └── deploy-pages.yml        # 推送 main 后自动发布 dist/
├── .openai/hosting.json        # Sites 托管配置
└── .impeccable/design.json     # 设计数据
```

## 本地维护

使用 Node.js 22 或更新版本。首次运行 `npm ci` 安装项目依赖，然后运行 `npm run dev`，打开终端提示的本地地址。修改 `content/` 中的 Markdown、配置或素材后，预览会自动更新；错误内容会在终端提示，保留上一版可用预览。

运行 `npm test` 构建并检查，`npm run build` 仅生成发布文件。推送 `main` 后由 GitHub Actions 自动构建并发布；功能分支供本地体验，推送不会更新线上网站。

新增文章、图片、视频、字幕和 PDF 的具体步骤见 [内容维护指南](docs/CONTENT.md)。
