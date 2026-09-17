---
title: JavaScript 方法重写
date: 2024-05-24
category: JavaScript
tags: [JavaScript]
summary: "构造函数上是否有Symbol.hasInstanceSymbol.hasInstance用于判断某对象是否为某构造器的实例。因此你可以用它自定义 instanceof 操作符在某个…"
---

#### 数组

##### reduce

```js
// reduce 用来迭代数组的方法，实现累计
// arr.reduce(callback, initial),依次迭代数组中的每一项，并且每次把callback执行，传递三个值
//  result: 上一次迭代的结果，并作为初始值传递给下一次迭代[如果是第一次执行，默认是数组的第一项]
//  item：依次遍历的每一项
//  index：数组下标
Array.prototype.reduce = function(callback, initial) {
	if (typeof callback !== 'function') throw new Error('callback must be a function')
  let self = this
  let i = 0
  let len = self.length
  if (typeof initial === 'undefined') {
  	initial = self[0]
    i = 1
  }
  for(; i < len; i++) {
  	let item = self[i]
    initial = callback(initial, item, i)
  }
  return initial
}
```

##### reduceRight

```js
// 反向迭代数组
Array.prototype.reduceRight = function (callback, initial) {
	if (typeof callback !== 'function') throw new TypeError('callback is must be a function!')
  let self = this,
      len = self.length,
      i = len - 1
  if (typeof initial === 'undefined') {
    initial = self[len - 1]
  	i = len - 2
  }
  for(; i > 0; i--) {
  	let item = self[i]
    initial = callback(initial, item, i)
  }
  return initial
}
```

##### map

```js
// 同forEach,只是map方法有返回值
Array.prototype.map = function map(callback, initial) {
    if (typeof callback !== 'function') throw new TypeError('callback must be a function')
    let self = this
    let i = 0
    let len = self.length
    let ary = []
    initial = initial || self
    for (; i < len; i++) {
        let item = self[i]
        ary[i] = callback(item, i, initial)
    }
    return ary
}
```

##### filter

```js
// 过滤数组中的每一项，返回符合条件的项
Array.prototype.filter = function filter(callback, initial) {
    if (typeof callback !== 'function') throw new TypeError('callback must be a function')
    let self = this
    let i = 0
    let len = self.length
    let ary = []
    initial = initial || self
    for (; i < len; i++) {
        let item = self[i]
        if (callback(item, i, initial)) ary.push(item)
    }
    return ary
}
```

##### some

```js
// 判断数组中是否有符合条件的项
Array.prototype.some = function some(callback, initial) {
    if (typeof callback !== 'function') throw new TypeError('callback must be a function')
    let self = this
    let i = 0
    let len = self.length
    initial = initial || self
    for (; i < len; i++) {
        let item = self[i]
        if (callback(item, i, initial)) return true
    }
    return false
}
```

#### 函数

##### call

```js
Function.prototype.call = function call(context, ...params) {
  if (context == null) context = window
  let self = this
  context.fn = self
  let result = context.fn(...params)
  delete context.fn
  return result
}
```
  
##### apply

```js
Function.prototype.apply = function apply(context, params) {
  if (context == null) context = window
  let self = this
  context.fn = self
  let result
  if (params) {
    result = context.fn(...params)
  } else {
    result = context.fn()
  }
  delete context.fn
  return result
}
```

##### bind
```js
Function.prototype.bind = function bind (context) {
  if (context == null) context = window
  var params = [].slice.call(context, 1)
  var self = this
	return function proxy(){
  	var args = [].slice.call(arguments)
    params = params.concat(args)
    return self.apply(context, params)
  }
}
/* Function.prototype.bind = function bind(context, ...params) {
    if (context == null) context = window;
    let self = this;
    return function proxy(...args) {
        params = params.concat(args);
        return self.call(context, ...params);
    };
}; */

```

#### 对象

##### for in

 *弊端*
- 优先遍历数字属性，并且按照从小到大遍历，然后再去遍历其他
- 无法遍历Symbol私有属性
- 遍历了所属类原型上自定义且未设置不可枚举属性(enumerable)的属性和方法[遍历了共有的，内置的是不可枚举的]

```js
Object.prototype.xx = 'xx'
let obj = {
  name: 'test',
  age: 18,
  3: 3,
  0: 10,
  [Symbol('A')]: function(){}
}

for(let key in obj) console.log(key)

// 0, 3, name, age, xx

function forInSelf(obj, callback) {
  	// 获取私有的属性：Object.keys(obj) OR Object.getOwnPropertyNames(obj) ；返回包含所有非symbol私有属性的数组
    // Object.getOwnPropertySymbols 获取所有的Symbol私有属性「数组」
    let keys = [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)]
    let len = keys.length
    for(let i = 0; i < len; i++) {
        let key = keys[i]
        let value = obj[key]
        callback(value, key)
    }
}
forInSelf(obj, (value, key) => {
    console.log(key)
})
// 0, 3, name, age, Symbol(A)
```

##### 检测是否是对象的公有属性

```js
Oobject.prototype.hasPubProperty = function hasPubPtoperty(attr) {
  var self = this
	var prototype = Object.getPrototypeOf(self)
  while(prototype) {
    if (prototype.hasOwnProperty(attr)) return true
    /* var keys = Object.keys(prototype) 这样是获取不到内置类原型上的属性和方法的
    if (typeof Symbol !== 'undefined') {
    	keys.concat(Object.getOwnPropertySymbol(prototype))
    }
    if (keys.indexof(attr) >= 0) return true*/
  	prototype = Object.getPrototypeOf(prototype)
  }
  return false
}
```

##### instanceof

检测原理：
构造函数上是否有Symbol.hasInstance[Symbol.hasInstance用于判断某对象是否为某构造器的实例。因此你可以用它自定义 instanceof 操作符在某个类上的行为。]
检测构造函数的prototype是否出现在实例的__proto__上

```js

function Instance_of (example, classFunc) {
  // 参数检查 
  if (typeof classFunc === 'undefined') throw new TypeError('params of classFunc is not a function')
  if (example == null) return false
  // 如果支持Symbol.hasInstance就用此方法来检测
  if (typeof Symbol !== 'undefined') {
    var hasInstance = classFunc[Symbol.hasInstance]
    if (typeof hasInstance !== 'undefined') {
      return hasInstance.call(classFunc, example)
    }
  }
  // 基于原型链的方式来检测
  var prototype = classFunc.prototype
  // 获取构造函数的原型对象[箭头函数没有prototype属性]
  var proto = Object.getPrototypeOf(example)
  // 获取对象的__proto__属性
  if (!prototype) return false
  while(true) {
    if (proto === null) return false
    if (proto === prototype) return true
    proto = Object.getPrototypeOf(proto)
  }
}

```

##### new 

new 操作符的机制：
> 默认创建一个对象[实例]，并且将这个实例对象的__proto__属性指向类的prototype
> 把构造函数执行，并且让函数中的this指向创建的实例对象
> 如果实例对象没有返回值或者返回的是原始类型的值，默认将实例对象返回，如果返回的是对象类型，那么以返回值为主

```js
function _new(Ctor, ...params) {
  let obj = {},
      result,
      reg = /^(object|function)$/
  obj.__proto__ = Ctor.prototype
  result = Ctor.call(obj, params)
  if (reg.test(typeof result)) return result
  return obj
}
// 兼容写法
function _new1(Ctor) {
    var reg = /^(object|function)$/,
        obj,
        params,
        result
    if (!reg.test(typeof Ctor) || !reg.test(typeof Ctor.prototype)) throw new TypeError('Ctor must be a function')
    params = [].slice.call(arguments, 1)
    obj = Object.create(Ctor.prototype)
    result = Ctor.apply(obj, params)
    if (reg.test(typeof result)) return result
    return obj
}
```

##### Object.create

```js
// Object的实例无法调用create方法，所以需要create是Object的一个工具方法
// 返回一个对象，并且对象的__proto__ 指向prototype
Object.create = function create(prototype) {
    if (!/^(object|function)$/i.test(typeof prototype)) throw new TypeError('Object prototype may only be an Object or null');
  // 1、考虑IE的__proto__的问题,不能使用__proto__，那么只能基于类的方式来实现
    //function proxy() {}
    //proxy.prototype = prototype;
    //return new proxy;
  // 2、不考虑__proto__的问题
  var obj = {}
  obj.__proto__ = prototype
  return obj
};
```
