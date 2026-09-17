---
title: Vue3 响应式原理
date: 2024-06-11
category: Vue
tags: [Vue3, 响应式]
summary: "Coposition API 对Tree-shaking 更加友好，代码也更容易压缩。"
---

- 在Vue2中使用`Object.defineProperty`来进行数据劫持，需要对属性进行重写添加`getter` `setter` 方法。
- 当新增属性和删除属性时无法监控变化。需要通过`$set`、`$delete`实现
- 数组不采用`defineProperty`来进行劫持(浪费性能，对所有索引进行劫持造成性能浪费),需要对数组的方法进行单独处理
> Vue3中使用Proxy来实现响应式数据变化，解决上诉问题。

## CompositionAPI
- 在Vue2中采用的是OptionsAPI,用户提供的data,props,methods,computed,watch等属性
- Vue2中所有的属性都是通过`this`来范文，`this`存在指向明确问题
- Vue2中很多没有使用的方法或属性依旧会被打爆，并且所有全局API都在Vue对象上公开。  
Coposition API 对Tree-shaking 更加友好，代码也更容易压缩。
- 组建逻辑共享问题，Vue2采用mixins实现组建之间的逻辑共享，但是会有数据来源不明确、命名冲突的问题。
> 简单的组建仍然可以采用OptionsAPI 进行编写，compositionAPI 在复杂逻辑中有很大的优势。`reactvity`模块中就包含了很多常用API,如 computed、reactive、ref、effect等

## Reactive函数
- **packages/reactivity.ts**
```js
import { isObject } from "@vue/shared"
import { mutableHandler } from "./handler"

// 缓存代理过的对象， target => proxy
// WeakMap防止内存泄漏，同时属性必须是对象
const reactiveMap = new WeakMap()

export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive'
}

export const reactive = target => {
  return createReactiveObj(target)
}

// 响应式的核心逻辑
function createReactiveObj(target) {
  // reactive只能处理对象类型的数据
  if (!isObject(target)) return target
  /**
   * 如果已经代理过，直接返回代理过的对象，防止重复代理同一个对象
   * 从缓存的weakMap中取值
   * let obj = { name: 'ls' }
   * const state = reactive(obj)
   * const state1 = reactive(obj)
   *  */
  let existProxy = reactiveMap.get(target)
  if (existProxy) return existProxy
   /**
   * 如果代理一个已经是代理对象的对象，就直接返回代理对象
   * 如果不是一个代理对象的话，在取值的时候添加一个标识为true，当再次代理 代理对象时
   * 先取标识，看看是否存在，如果存在标识已经被代理过得，直接返回
   * let obj = { name: 'ls' }
   * const state = reactive(obj)
   * const state1= reactive(state)
   *  */
   if (target[ReactiveFlags.IS_REACTIVE]) return target

  // 生成一个代理对象并返回
  const proxy = new Proxy(target, mutableHandler)
  reactiveMap.set(target, proxy)
  return proxy
}

```

**handler.ts**
```js
import { activeEffect, effect } from "./effect"
import { ReactiveFlags } from "./reactivity"

export const mutableHandler = {
  // 原始对象，属性，代理对象
  get(target, key, receiver) {
    console.log(`属性${key}被使用了`)
    // 防止访问标识
    if (key === ReactiveFlags.IS_REACTIVE) return true
    // 防止代理 代理对象，给目标添加一个标识
    target[ReactiveFlags.IS_REACTIVE] = true
    // 为什么使用Reflect，详细的原因见reflect-test.js
    return Reflect.get(target, key, receiver)
  },
  set(target, key, val, receiver) {
    let oldVal = target[key]
    let flag = Reflect.set(target, key, val, receiver)
    return flag
  }
}
```

## 实现effect函数

**effect.ts**
```js
export let activeEffect = undefined // 当前正在执行的effect

function cleanupEffect(effect) {
	let { deps } = effect
	let len = deps.length
	for(let i = 0; i < len; i++) {
		deps[i].delete(effect)
	}
	// 清空依赖列表
	effect.deps.length = 0
}

class ReactiveEffect {
	parent: undefined // 为了处理嵌套effect的情况
	deps = [] // [new Set(), new Set] 记录effect依赖的属性列表
	constructor(public fn) { }
	run() {
		try {
			this.parent = activeEffect
			activeEffect = this
			// 当函数执行的时候需要将对应的effect和属性关联起来
			return this.fn() // 触发属性的get
		} finally {
			activeEffect = this.parent
		}
	}
}

export function effect(fn) {
	const _effect = new ReactiveEffect(fn)
	// 默认让用户的函数执行一次
	_effect.run()
}
```

## 依赖收集

- **handler.ts**

```js{12,19-21}
import { activeEffect, effect } from "./effect"
import { ReactiveFlags } from "./reactivity"

export const mutableHandler = {
  // 原始对象，属性，代理对象
  get(target, key, receiver) {
    console.log(`属性${key}被使用了`)
    // 防止访问标识
    if (key === ReactiveFlags.IS_REACTIVE) return true
    // 防止代理 代理对象，给目标添加一个标识
    target[ReactiveFlags.IS_REACTIVE] = true
    track(target, key)
    // 为什么使用Reflect，详细的原因见reflect-test.js
    return Reflect.get(target, key, receiver)
  },
  set(target, key, val, receiver) {
    let oldVal = target[key]
    let flag = Reflect.set(target, key, val, receiver)
    if (oldVal !== val) {
      trigger(target, key, val, oldVal)
    }
    return flag
  }
}
```

## 实现track函数

- **effect.js**

```js
// 将effect和对象obj以及key:name进行关联
// Map: { obj: Map1 }
// Map1: { name: new Set(effect) }
// 创建对象和effect的缓存对象
let targetMap = new WeakMap()
export function track(target, key) {
  // 获取当前对象是否已经收集过依赖
  let depsMap = targetMap.get(target)
  // 如果没有收集，就给当前对象创建一个map，同时放到缓存对象中
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  // 获取当前对象的当前属性是否有收集依赖
  let deps = depsMap.get(key)
  // 如果没有收集，给当前属性，创建一个空的Set,最终dep就是一个属性保存的effect集合
  if(!deps) depsMap.set(key, (deps = new Set()))
  // 是否需要收集依赖，标准是当前属性的Set中是否有activeEffect
  let shouldTrack = !deps.has(activeEffect)
  if (shouldTrack) {
    deps.add(activeEffect)
    // 让effect也记录当前effect中对应有哪些dep
    activeEffect.deps.push(deps)
  }
}
```

## 触发更新

- **handler.js**
```js
set(target, key, value, receiver) {
    // 等会赋值的时候可以重新触发effect执行
    let oldValue = target[key]
    const result = Reflect.set(target, key, value, receiver);
    if (oldValue !== value) {
        trigger(target, key, value, oldValue);
    }
    return result;
}

```

- **effect.js**
```js
export function trigger(target, key?, newValue?, oldValue?) {
  // 通过对象找到属性对应的映射表
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  // 通过属性找到 effecMap
  let dep = depsMap.get(key);
  if (dep) {
    triggerEffects(dep);
  }
}

```

## 分支切换及`cleanup`

目前会产生的问题

```js
const state = reactive({ flag: true, name: "ls", age: 30 });
effect(() => {
  // 副作用函数 (effect执行渲染了页面)
  console.log("render");
  document.body.innerHTML = state.flag ? state.name : state.age;
});
setTimeout(() => {
  state.flag = false;
  setTimeout(() => {
    console.log("修改name，原则上不更新");
    state.name = "test"; // 这里还是会触发更新
  }, 1000);
}, 1000);

```
需要进行清理工作
```js{1-9,20}
function cleanupEffect(effect) {
	let { deps } = effect
	let len = deps.length
	for(let i = 0; i < len; i++) {
		deps[i].delete(effect)
	}
	// 清空依赖列表
	effect.deps.length = 0
}

class ReactiveEffect {
	parent: undefined // 为了处理嵌套effect的情况
	deps = [] // [new Set(), new Set] 记录effect依赖的属性列表
	constructor(public fn) { }
	run() {
		try {
			this.parent = activeEffect
			activeEffect = this
			// 在执行之前清理effect，运行run的时候重新收集一次依赖
			cleanupEffect(this)
			// 当函数执行的时候需要将对应的effect和属性关联起来
			return this.fn() // 触发属性的get
		} finally {
			activeEffect = this.parent
		}
	}
}
```