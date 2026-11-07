# LizPink 个人终端

[在线访问](https://lizpink.github.io/) · [项目源码](https://github.com/LizPink/LizPink.github.io)

一个使用 HTML、CSS 和 JavaScript 编写的个人网站，网站基于 GPT-6.1 VibeCoding。

## 项目结构

```text
lizpink-terminal/
├── dist/                      # 网站源码与发布目录
│   ├── index.html             # 页面入口
│   ├── favicon.svg
│   ├── .nojekyll
│   └── assets/
│       ├── js/                # 内容、命令与页面交互
│       ├── css/               # 布局、主题与输入区样式
│       ├── fonts/             # 本地字体及许可
│       └── media/             # 图片、视频与字幕
├── docs/                      # 产品与设计说明
│   ├── PRODUCT.md
│   └── DESIGN.md
├── .github/workflows/
│   └── deploy-pages.yml        # 推送 main 后自动发布 dist/
├── .openai/hosting.json        # Sites 托管配置
└── .impeccable/design.json     # 设计数据
```
