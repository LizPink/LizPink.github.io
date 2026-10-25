// 日常维护主要修改这个文件。请保留引号、逗号和括号。
window.LIZPINK_CONTENT = {
  name: "LizPink",
  role: "学生 / Student",
  interests: ["Computer Graphics", "Computer Engineering", "Games", "Artificial Intelligence"],
  intro: "在这里，记录学习、项目与生活。",
  about: {
    heading: "你好，我是 LizPink。",
    paragraphs: [
      "我是一名学生，对计算机图形学、计算机工程、游戏和人工智能感兴趣。",
      "这个网站是我的个人空间。你可以从生活、经历或研究三个方向浏览。"
    ],
    tags: ["Student", "Computer Graphics", "Computer Engineering", "Games", "Artificial Intelligence"]
  },
  // 收到你的真实简历后，填入教育经历、技能等。保持为空时显示待补充状态。
  // 示例结构：{ heading: "教育经历", items: [{ title: "真实学校与专业", detail: "真实起止时间与说明" }] }
  resume: {
    introduction: "我是 LizPink，一名学生。这里整理我的经历、项目与实践；简历先从一段自我介绍开始，之后再逐步补充。",
    sections: [],
    // 把 PDF 放入 dist/files/resume.pdf 后，将下一行改成 \"./files/resume.pdf\"。
    pdfUrl: ""
  },
  // 三条路线只引用下面 samples 的条目。同一条内容可在多个路线出现，只需维护一次。
  paths: [
    { id: "life", number: "01", title: "生活与记录", command: "life", description: "一些兴趣、随笔和生活片段。", introduction: "给学习之外的兴趣与生活留一点位置，也保留过去的记录。", items: ["journal", "notebook"] },
    { id: "resume", number: "02", title: "经历与能力", command: "resume", description: "了解我的经历、技能与项目，查看简历。", introduction: "从一段自我介绍开始，逐步整理学习经历、实践项目和简历。", items: ["profile", "geometry"] },
    { id: "research", number: "03", title: "研究与探索", command: "research", description: "看看我关注的问题、学习记录与相关实践。", introduction: "记录感兴趣的问题、学习的过程，以及把想法变成实验的尝试。", items: ["question", "geometry", "animation"] }
  ],
  // 以下均为示例。替换标题、文字和媒体路径后，将 example 改为 false 即可去掉示例标识。
  // type 可用 text、image、video；删除路径中不需要的 items 条目即可隐藏对应内容。
  samples: {
    profile: { example: true, type: "text", title: "一段经历，放在这里", text: "这里可以写一段真实的学习或实践经历：做了什么、负责什么、学到了什么。学校、时间和技能等具体信息，留待之后补充。" },
    question: { example: true, type: "text", title: "从一个问题开始", text: "这里可以记录一个感兴趣的问题、相关阅读和尝试过的方法。暂时没有结果也可以，学习过程本身就值得保存。" },
    geometry: { example: true, type: "image", title: "一张项目截图的位置", text: "这张几何示意图用于展示图片排版。之后可以换成项目截图、实验结果图或作品照片。", src: "./media/demo-geometry.svg", alt: "示例图片：琥珀色的几何线框与坐标轴，不代表个人项目成果。", caption: "图片示例 · 几何示意图，待替换" },
    animation: { example: true, type: "video", title: "让一个想法动起来", text: "这里可以放实验、游戏或图形作品的演示视频。先用一段无声几何动画看看播放效果。", src: "./media/demo-orbit.mp4", poster: "./media/demo-orbit-poster.svg", captions: "./media/demo-orbit.zh.vtt", caption: "视频示例 · 无声线框几何旋转动画，待替换" },
    journal: { example: true, type: "text", title: "留下一小段日常", text: "一本书、一款游戏，或某个突然想记下来的想法，都可以放在这里。之后用自己的文字替换这一段即可。" },
    notebook: { example: true, type: "image", title: "给兴趣留一点空间", text: "这里可以放随手记录、游戏截图、读书片段或生活照片。先留一张学习流程示意图，看看图片和文字放在一起的感觉。", src: "./media/demo-notebook.svg", alt: "示例图片：绿色节点组成的学习流程示意图，待替换。", caption: "图片示例 · 学习流程示意图，待替换" }
  }
};
