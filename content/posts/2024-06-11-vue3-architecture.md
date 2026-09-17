---
title: Vue3 架构
date: 2024-06-11
category: Vue
tags: [Vue3, 源码]
summary: "Monorepo 是管理项目代码的一个方式，指在一个项目仓库(repo)中管理多个模块/包(package)。 Vue3 源码采用 monorepo 方式进行管理，将模块拆分到 p…"
---

## Monooepo 管理项目
Monorepo 是管理项目代码的一个方式，指在一个项目仓库(repo)中管理多个模块/包(package)。 Vue3 源码采用 monorepo 方式进行管理，将模块拆分到 package 目录中。作为一个个包来管理，这样职责划分更加明确。

- 一个仓库可维护多个模块，不用到处找仓库
- 方便版本管理和依赖管理，模块之间的引用，调用都非常方便

## Vue3项目结构
![vue3结构图](/images/notes/vue/jiagou.png)

