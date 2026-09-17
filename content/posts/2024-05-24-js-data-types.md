---
title: JavaScript 数据类型
date: 2024-05-24
category: JavaScript
tags: [JavaScript]
summary: "数据类型(https://www.yuque.com/silencewood/xdkhfx/dvcf35?singleDoc#)"
---

### 数据类型分类

#### 基础数据类型
- 数字(number)
- 字符串(string)
- 布尔值(boolean)
- null(null)
- undefined(undefined)
- symbol(symbol) ES6
- bigint(bigint) ES10

#### 引用数据类型
- object：对象、数组、正则、日期、Math、实例对象等
- function

### 数据类型

[数据类型](https://www.yuque.com/silencewood/xdkhfx/dvcf35?singleDoc#)

### 数据类型转换
[数据类型转换](https://www.yuque.com/silencewood/xdkhfx/bn9siu?singleDoc#)

### 数据类型转换示例

#### 对象转数字/字符串

```js
let obj = { name: 10 }, n = 10
console.log(obj - n) // NaN
// 先检测obj上有没有Symbol.toPrimitive => undefined，没有这个属性
// 调用valueOf()获取原始值 => {name: 10},不是原始值
// 调用toString() => "[object Object]",是原始值转换成数字进行运算
// Number("[object Object]") => NaN “-”数值运算，转换成数字
// NaN - 10=> NaN
console.log(obj + n) // "[object Object]10"
// 先检测obj上有没有Symbol.toPrimitive => undefined，没有这个属性
// 调用valueOf()获取原始值 => {name: 10},不是原始值
// 调用toString() => "[object Object]",是原始值转换成字符串进行运算
// "[object Object]" + 10 => "[object Object]10" “+”号也是数值运算，但是如果有一边是字符串那么会变成字符串拼接
```

如果想要变成数字运算，那么需要实现`toPrimitive`、`valueOf`、`toString`、`Number`方法

```js
let obj = { name: 10 }, n = 10
obj[Symbol.toPrimitive] = function (hint) {
  console.log(hint)
  return 100
}
console.log(obj - n) // 90
console.log(obj + n) // 110

```

转换示例

```js
// 
// 1、数据隐式转换
/* let a = {
	n: 1,
  [Symbol.toPrimitive]() {
  	return this.i++
  }
}
*/
// 2、数据劫持
var i = 0
Object.definePrototype(window, 'a', {
	get (){
  	return ++i
  }
})
// 3、其他
let a = [1, 2, 3]
a.toString = a.shift // 从头部弹出，
if (a == 1 && a == 2 && a == 3) { console.log('OK') }
```

```js
let result = 10 + 21.2 + true + null + undefined + 'test' + [] + null + 9 + false

// NaNtestnull9false Number(null) -> 0, Number(undefined) -> NaN String([]) -> ''
```

### 数据类型检测
[类型检测](https://www.yuque.com/silencewood/xdkhfx/ggclb5?singleDoc#)

### 变量提升
[变量提升](https://www.yuque.com/silencewood/xdkhfx/nc0pfg?singleDoc#)

### let/const 和 var/function的区别
[区别](https://www.yuque.com/silencewood/xdkhfx/oazzlu?singleDoc#)

### 严格模式和非严格模式

是两种编译模式，严格模式会遵循JS的语法规则。主要区别在于

1、变量声明：在非严格模式下，变量声明可以不使用var/let/const声明，在严格模式下必须使用var/let/const声明

2、函数声明：在非严格模式下，函数声明可以不使用function声明，在严格模式下必须使用function声明

3、this指向：在非严格模式下，this指向window，在严格模式下，this指向undefined

4、全局变量：在非严格模式下，全局变量不会被限制在全局作用域下，在严格模式下，全局变量会被限制在全局作用域下

5、对象属性：在非严格模式下，对象属性可以不使用var/let/const声明，在严格模式下，对象属性必须使用var/let/const声明

6、对象方法：在非严格模式下，对象方法可以不使用function声明，在严格模式下，对象方法必须使用function声明


> 如func.call()/func.apply()
非严格模式：this -> window[传递的第一个参数是null/undefined也是window]
严格模式：this -> undefined[传递的第一个参数是谁this就是谁]
2、在函数执行时
非严格模式下：初始化arguments和形参赋值后会将arguments和形参建立一个映射机制
