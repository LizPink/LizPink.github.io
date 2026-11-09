---
title:		"2026Fall-Render-from-Scratch"
sections: 	[project]
publishedAt:	"2026-10-01"
---

这这个项目中，我打算从零开始实现一个自己的光线追踪（离线）渲染器！这个项目的源代码已经发布到 GitHub [项目主页](https://github.com/LizPink/2026Fall-Renderer-from-Scratch)，这里会同步更新项目的开发信息。

## 代码规范

## 更新日志

### 2026-11-04 漫反射材质

更新了材质设定，在添加了基础光源模块的基础上，引入了基础的材质（Lambert Material）. 这是一个完全漫反射的材质（反射光能的空间分布是均匀的），其 BRDF 为一个常函数。为了检测渲染器的最新功能，我们仍然采用 Cornell Box 作为检测的场景，只不过我们在场景里额外为各个物体添加了 Lambert 材质。

<img src="C:\Users\13377\Desktop\Web\lizpink-terminal\content\entries\2026Fall-Render-from-Scratch\photos\20261104-CornellBox.png" alt="20261104-CornellBox" style="zoom:33%;" />

可以看到，在这样一个具有两个光源的直射光场景中，漫反射材质整体不会有特别明亮的反射点。因为没有引入全局光照（间接光照部分），整个场景的亮度还是偏低，有一种比较暗淡的感觉。

### 2026-11-09 间接光照技术

晚上好，我们最近引入了新的照明技术——间接光照技术（Indirect Lighting），这将完善我们已有的直接光照技术，使我们的照明渲染从局部光照拓展为全局光照！对于同样的场景，采用全局光照技术渲染的对比结果如下，明显比上一次更新时渲染的场景更加明亮了，同时左右两边墙体的反光颜色也能反映在天花板和球体表面上。

:::compare

<img src="C:\Users\13377\Desktop\Web\lizpink-terminal\content\entries\2026Fall-Render-from-Scratch\photos\20261104-CornellBox.png" alt="20261104-CornellBox" style="zoom:33%;" />

<img src="C:\Users\13377\Desktop\Web\lizpink-terminal\content\entries\2026Fall-Render-from-Scratch\photos\2026-11-09-CornellBox(1).png" alt="2026-11-09-CornellBox(1)" style="zoom:33%;" />

:::

通过另外一张更加明显的场景图片，我们可以看到，全局光照技术极大提升了场景渲染的真实度。例如在天花板，你可以看到天花板的左侧被红色的光映照成了浅红色、天花板的右侧被蓝色光映照成了浅蓝色；与此同时在左边的小球中，左侧表面被红色的墙体反射成了红色、右侧的表面被右边的墙体反射成了蓝色。

<img src="C:\Users\13377\Desktop\Web\lizpink-terminal\content\entries\2026Fall-Render-from-Scratch\photos\2026-11-09-CornellBox(2).png" alt="2026-11-09-CornellBox(2)" style="zoom:33%;" />

当然全局光照技术并不是百利而无一害的，为了引入局部光照，我们需要更多的计算开销才能渲染一个像素点。也就是说渲染上面这张图片的时间比渲染之前图片的时间明显增加了。

> 在我们的测试中，设置 Release 模式、渲染 1920x1080 个像素、同时开启 20 个渲染线程、每个像素采样 100 次、全局光照最大递归深度为 10 层），在实验组和对照组各自进行了 5 次测试。情况表明：在开启直接光照的情况下，渲染时间的中位数为 47 秒，而开启了全局光照之后，这一数字跃升至 274 秒。

为此，在项目中我们采用了一项优化技术——俄罗斯轮盘（Russian Roulette）算法，在保证采样精度的情况下尽可能缩短渲染的时间，以下是俄罗斯轮盘算法的优点：我们的局部光照技术是使用递归完成计算的，为了防止计算的开销过大，我们限制了最大递归深度。因此，理论上如果需要还原真实的亮度，需要进行无限次递归。如果限制了采样（递归）次数，那么得到的估计值，在统计意义上一定是存在系统性偏误的。俄罗斯轮盘算法引入了统计意义上无偏的估计方法：每次计算时随即开始抛硬币，如果不幸则停止递归（计算反射光），如果幸运采取递归，并且对计算的亮度结果进行奖励，以补偿没有采取递归（没有计算反射光）的亮度损失。

> 比如，一种俄罗斯轮盘算法如下：进行成功概率为 0.8 的一次赌博。如果成功，就递归计算采样值，并且将采样值除以0.8 补偿不采样时造成的损失，否则就不递归采样。

在具体实现中，我们会同时结合递归限制与俄罗斯轮盘算法进行采样计算，设置一个最大 Max 和最小 Min 的深度：保护前 Min 次的反射光计算以保证精度，同时最多进行 Max 次计算以节省计算开销。这样做的好处是可以避免过于不幸（导致实际精度损失）和过于幸运（计算开销过大）的问题，同时仍然保持不错的渲染效果。

> 在我们的测试中，设置 Release 模式、渲染 1920x1080 个像素、同时开启 20 个渲染线程、每个像素采样 100 次、全局光照迭代最大递归深度为 12 层、俄罗斯轮盘有 80% 的存活率，在实验组和对照组各自进行了5次交替渲染。结果表明：开启了俄罗斯轮盘算法的实验组，渲染时间的中位数为 183.83 秒，范围为164.75～200.40秒。没有开启俄罗斯轮盘算法的对照组，渲染时间的中位数为 277.26秒，范围为 267.29～305.18秒，总体节省了节时 33.70% 的渲染时间。

:::compare

<img src="C:\Users\13377\Desktop\Web\lizpink-terminal\content\entries\2026Fall-Render-from-Scratch\photos\20261109-RussianRoulette-OFF.png" alt="20261109-RussianRoulette-OFF" style="zoom:33%;" />

<img src="C:\Users\13377\Desktop\Web\lizpink-terminal\content\entries\2026Fall-Render-from-Scratch\photos\20261109-RussianRoulette-ON.png" alt="20261109-RussianRoulette-ON" style="zoom:33%;" />

:::

### 2026-11-？ 镜面反射材质

预告：我们最近将引入新的材质——镜面反射材质（Specular Material），这将是完全不同于 Lambert 的材质，它具有完全的镜面反射性质，也就是说它的 BRDF 将只在某一个特定方向具有脉冲分布！

具体来说，镜面材质的 BRDF 分为两种情况：导体和绝缘体。因为物质内部的电子行为会影响光的作用效果，需要分别讨论。针对导体，物理学家菲涅尔（Fresnel）在1820年代通过实验确定了光学折射的规律：

