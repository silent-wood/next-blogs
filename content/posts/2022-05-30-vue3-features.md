---
title: Vue3 特点及优势
date: 2022-05-30
category: Vue
tags: [Vue3]
---

- Vue3更注重模块上的拆分，在2.0中无法单独使用部分模块。需要完整的引入Vue,Vue3中模块之间耦合度低，模块可以独立使用。**拆分模块**
- Vue2中很多方法挂在到了实例中导致没有使用的包也会被打包。通过构建工具Tree--shaking机制实现按需引入，减少用户打包后体积。**重写API**
- Vue3允许自定义渲染器 `createRenderer` ，扩展力强。不会发生以前的事情，改写Vue源码改造渲染方式。**扩展更方便**

## 声明式框架
> Vue3依旧采用声明式的框架，用起来简单。

**命令式和声明式区别**
- 命令式框架重要特点就是关注过程
- 声明式框架关注结果
> 声明式代码更加简单，不关注实现，按照要求填写代码
```js
// 命令式编程
let numbers = [1,2,3,4,5], total = 0;
for(let i = 0; i < numbers.lenger; i++) {
    total += numbers[i] // 关注过程
}
// 声明式编程
let total2 = numbers.reduce((total, number) => total + number, 0)

```

## 采用虚拟DOM
- 虚拟DOM是真实DOM的抽象，是真实DOM的简化版，可以理解为JavaScript对象。
- 虚拟DOM可以实现跨平台，可以运行在浏览器端，也可以运行在服务端

```js
const vnode = {
  type: 'div',
  props: {
    id: 'hello'
  },
  children: [
    /* 更多 vnode */
  ]
}
```

## 区分编译时和运行时
- 编译时(compiler)：发生在代码写入到内存中，在代码运行之前，编译工具编译成JS
- 运行时(runtime)：发生在代码运行时，如在浏览器中运行
