---
title: 浏览器渲染原理
date: 2025-07-23
category: JavaScript
tags: [浏览器, 渲染原理]
summary: "CRP关键渲染路径(https://developer.mozilla.org/zh-CN/docs/Web/Performance/Criticalrenderingpath)"
---

[CRP关键渲染路径](https://developer.mozilla.org/zh-CN/docs/Web/Performance/Critical_rendering_path)
## 浏览器是如何渲染页面

当浏览器的网络线程收到 HTML 文档后(文档其实是一个`16进制文件流`)，浏览器解析成`HTML字符串`，会产生一个渲染任务，并将其传递给渲染主线程的消息队列。  
在事件循环机制的作用下，渲染主线程取出消息队列中的渲染任务，开启渲染流程。  


整个渲染流程氛围多个阶段，分别是： HTML 解析、样式计算、布局、分层、绘制、分块、光栅化和显示。  
每个阶段都有明确的输入和输出，上一个阶段的输出会成为下一个阶段的输入。  
这样，整个渲染流程就形成了一套组织严密的生产流水线。  

![渲染流程](/images/notes/js/rendering.png)

### 解析 HTML
- 输入：HTML字符串
- 输出： DOM树、CSSOM树

解析过程中遇到 CSS 解析 CSS，遇到 JS 执行 JS。为了提高解析效率浏览器在开始解析前，会启动一个预解析线程，率先下载 HTML 中的外部 CSS JS 文件。  
如果主线程解析到 `link` 位置，此时外部的 CSS  文件还没有下载解析好，主线程不会等待，继续解析后续的 HTML。这是引文下载和解析 CSS 的工作是在预解析线程中进行的。这就是 CSS 不会阻塞 HTML 解析的根本原因。  
如果主线程解析到 `script` 位置，会停止解析 HTML, 转而等到 JS 文件下载好，并将全局代码解析执行完成后，才能继续解析 HTML 。这是因为 `JS 可能会操作 DOM 树`，所以必须等到 JS 执行完成，才能继续解析 HTML。这就是 CSS 不会阻塞 HTML 解析的根本原因。

这一步骤完成后，会得到 `DOM树 CSSOM树`，浏览器的默认样式、内部样式、外部样式、行内样式均会包含在 CSSOM 树中。

### 样式计算（Computed Style）
- 输入：DOM树 CSSOM树
- 输出：Render Tree(渲染树)

主线程会遍历得到的 DOM 树，依次为树中的每个节点计算出它最终的样式，称之为 `Computed Style`。  
在这一过程中，很多预设值会变成绝对值，比如*red* 会变成 *rgb(255, 0, 0)*,相对单位变成绝对单位，不如*em* 变成 *px*。  
这一步骤完成后，会得到 `带有样式的 DOM 树`。

### 布局(Layout)
- 输入：Render Tree(渲染树)
- 输出：Layout树
> DOM树和Layout树不一定是对应的， 比如伪元素在DOM树中没有对应的节点，在Layout树中会对应一个节点,或者`display:none`没有几何信息，也不会生成布局树

这一步骤会计算出每个节点在屏幕中的位置，并将其保存在每个节点中。

### 分层(Layer)

主线程会使用一套负载的策略对整个布局树进行分层。  
分层的好处是将来一个层改变后，仅对该层进行处理，提高效率。  
滚动条、堆叠上下文、transform、opacity等样式都会多少影响分层结果，也可以通过 `will-change` 属性更大程度影响分层结果。 

### 绘制(Paint)
主线程为每个分层单独产生绘制指令集，用于描述这一层的内容该如何画出来。  

**渲染主线程的工作到此为止，剩余步骤交给其他线程完成。**

完成绘制后，主线层将每个图层的绘制信息交给合成线程，剩余工作由合成线程完成。  

### 分块(Tiling)

合成线程首先将每个图层进行分块，将其划分成更多的小区域。  
它会从线程池中取出过个线程来完成分块工作。  


### 光栅化(Raster)
此过程会用到 GPU 加速。  
光栅化是将每个块变成位图，优先处理靠近视口的块。

### 画(Draw)
计算出每个位图在屏幕上的位置，交给 GPU 进行最终的呈现。


## 优化CRP

提升页面加载速度需要通过被加载资源的优先级、控制它们加载的顺序和减小这些资源的体积。性能提示包含：
- 通过异步、延迟加载或者消除非关键资源来减少关键资源的请求数量
- 优化必须的请求数量和每个请求的文件体积
- 通过区分关键资源的优先级来优化被加载关键资源的顺序，来缩短关键路径长度。

基于上述原理，优化方式有：
### 语义化标签，避免深层次嵌套
  解析DOM 树层次越深越小号性能
### CSS 选择器 尽量不要嵌套太多
  CSS 选择器渲染是从右到左
### CSS 尽快获取
  1. style：少量可以选择，对渲染线程影响不大
  2. link：通过HTTP线程异步获取，不阻碍GUI渲染线程，但是需要注意HTTP最大并发数量
  3. @import: 会阻碍GUI渲染线程，避免使用
  4. CSS放在顶部
### 避免阻塞的JS加载
  1. 尽量使用异步加载
  2. 如果script没有src属性，async/defer会被忽略，同步加载，加载完成立即执行，会阻塞渲染线程
  3. async：没有依赖关系可以使用，异步加载，但是在加载完成后立即执行，阻塞渲染线程
  4. defer：有依赖关系使用， 异步加载，文档解析完成后执行，通常在`DOMontentLoaded`事件之前执行。
### 减少DOM的回流(Reflow)重绘(Repaint)
  1. 回流的本质是重新计算布局树  
     在老版本浏览器中，每一次改变样式、属性会触发一次回流、重绘，新版本浏览器中有一个机制`渲染队列机制`
     **渲染队列机制**：会将对DOM的样式、属性操作放入渲染队列中，当已经没有样式操作或者没有获取样式的操作才会刷新渲染队列，统一渲染。所以改动属性的`reflow`是异步完成的，导致可能无法及时获取最新的布局信息。
  2. 重绘的本质是重新根据分层信息计算绘制指令。  
     当改动了可见样式后，需要重新计算，引发重绘。  

  **回流必然重绘，重绘不一定回流**

```js
// 1.集中改变样式
let box = document.querySelector('#box')
box.style.width = '100px'
box.style.height = '100px'
// 集中改变
box.style.cssText = 'width: 100px; height: 100px'
// 或者
box.className = '.change'

// 2.读写分离
// 在获取的时候会触发一次回流重绘
let box = document.querySelector('#box')
box.style.width = '100px'
console.log(box.style.width)
box.style.width = '100px'
// 读写分离
let box = document.querySelector('#box')
box.style.width = '100px'
box.style.width = '100px'
console.log(box.style.width)

// 3.文档片段
let box = document.querySelector('#box'),
    frag = document.createDocumentFragment();
for (let i = 0; i < 10; i++) {
    let span = document.createElement('span');
    span.innerHTML = i + 1;
    frag.appendChild(span);
}
box.appendChild(frag);
```
------------------------------------------------------------

**为什么transform的效率高：由于`transform`改变的只是图层，不会影响其他图层，所以不会引发回流重绘。**





