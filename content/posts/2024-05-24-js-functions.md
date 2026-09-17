---
title: JavaScript 函数
date: 2024-05-24
category: JavaScript
tags: [JavaScript]
summary: "函数执行过程(https://www.yuque.com/silencewood/xdkhfx/ko82eh?singleDoc#)"
---

## 函数执行

[函数执行过程](https://www.yuque.com/silencewood/xdkhfx/ko82eh?singleDoc#)

## 形参赋值

### 前提条件

- 函数有形参默认值，并且无论是否生效
- 函数体中，有基于 `var/let/const` 声明的变量

### 规则
- 函数执行会生成一个私有上下文[EC(FN)], 作用域链 -> 初始化this -> 初始化arguments -> 形参赋值，私有上下文中的代码块不会执行
- 将函数体中的代码块作为一个单独的块级上下文[EC(B)]，作用域链 [EC(B) -> EC(FN) -> 全局]
- 如果EC(FN)中的某个变量和EC(B)中的某个变量一致，则在形成EC(B)的时候会将EC(FN)中的值同步给EC(B)中的变量名同步一份

```js
var x = 1
function fn(x, y = function(){x = 2}){
// 这里只满足有形参默认值，但是不满足EC(FN)中有基于let/var/const 声明变量，所以只形成EC(FN)
	x = 3;
  y()
  console.log(x)
}
fn(5) // 2
console.log(x)// 1
```

### 块级作用域示例

```js
var x = 1
function fn(x, y = function(){x = 2}){
// 两个前提条件都满足
  /*
  	* EC(FN)
    * SCOPE: EC(FN) -> EC(G)
    * 形参赋值：x = 5，y = function(){x=2}
    * 变量提升：var x
    *
  */
  /*
  	* EC(B)
    * SCOPE: EC(B) -> EC(FN) -> EC(G)
    * 形参赋值： --
    * 变量提升： var x
    * EC(B)中的x和EC(FN)的x同名，将EC(FN)中的x的值同步给EC(B)中：x = 5
    * 代码执行：x = 3
    * 				y()执行，EC(B)中没有私有的y,所以调用的是EC(FN)的y，修改的是EC(FN)中的x - 2
  */ 
	var x = 3;
  y()
  console.log(x)
}
fn(5) // 3
console.log(x)// 1
```

![形参赋值默认值](/images/notes/js/args.png)


```js
var x = 1;
function func(x, y = function anonymous1(){x=2}){
  /*
  	EC(FN):
    	作用域链：EC(FN) -> EC(G)
      初始化this：
      初始化arguments：
      形参赋值：x = 5, y = anonymous1()
  	EC(B):
    	作用域链：EC(B) -> EC(FN) -> EC(G)
      变量提升：
      	x: 本来应该是undefined，但是EC(B)中的x和他上级上下文EC(FN)中都有，所以讲EC(FN)中的值复制一份 -> 5
        y: 同上 -> anonymos2
       代码执行
       	x -> 3
        y执行，当前上下中有y，所以函数执行创建的私有上下文中的x指的是EC(B)中的x，x = 2
  */
    var x = 3;
    var y = function anonymous2(){x = 4}
    y();
    console.log(x);
};
func(5);
console.log(x);
```

## 匿名函数具名化

### 场景
```js
// 在函数中调用函数本身的需求中
(function (){
  // 这种方式只能是在非严格模式下，严格模式中会报错
	console.log(arguments.callee) // 函数本身
  console.log(arguments.callee.caller) // 函数执行所在的上下文对应的函数
})()
```

### 具名化

```js
// 1、只能在函数体中使用
(function fn() {
	console.log(fn)
})()
console.log(fn) // 报错，fn is not defined

// 2、如果在当前上下文中不通过var/let/const/function 进行重新声明定义的话是不能修改的
(function fn1(){
	/*
    fn = 10
    console.log(fn1) // 这是还是fn函数本身
	*/
  let fn1 = 20
  console.log(fn1) // 20,主要是具名化优先级较低
})()
```

## 作用域链
### 概念

**作用域链**：由多个上下文组成，每个上下文都包含一个变量对象(VO)，变量对象中存储了当前上下文中定义的变量和函数，变量对象可以分为**全局上下文**和**私有上下文**。全局上下文中的变量对象就是全局对象，在浏览器中全局对象就是window对象。私有上下文中包含的变量对象是**活动对象**(AO)，活动对象是在进入上下文时刻被创建的，它通过作用域链相互连接起来形成一个链表，这个链表就是作用域链。

**作用域链的形成**  
- 浏览器为`JS`分配了一个执行空间`执行上下文栈ECStack(Execution Context Stack)`
- 全局代码执行，生成一个`全局执行上下文[EC(G)]`,并将其压入栈顶,生成一个`全局变量对象[VO(G)]`
- 在全局上下文中创建函数会单独开辟一个堆内存，声明其`作用域：指的是当前上下文中的变量对象VO/AO`,函数执行形成一个新的私有上下文`[EC(fn)]`,作用域链就是`[EC(fn)， EC(G)]`

## 闭包

**闭包是一种机制而不是一种形式**

### 概念
函数运行时会形成一个私有上下文(EC(FN))，在函数体中代码执行之前会进行一系列的操作，比如`初始化作用域链`、`声明this`，`初始化arguments集合`、`形参赋值`、`变量提升`等。在形参赋值、变量提升的过程中变量如果是私有的会放到当前上下文中的变量对象AO中，保护变量不受外界所影响。在函数执行完成后，如果上下文中的某些内容(一般是指堆内存)被外界的事物(一般是事件或者变量绑定)所占用，导致函数在执行完成后私有上下文不能被出栈释放(释放是由垃圾回收机制GC决定的)，保存了该上下文中的私有变量可以供下级上下文使用。这样就形成了闭包。

### 作用
- `保护`私有变量不受外界所影响
- `保存`了该上下文中的私有变量可以供下级上下文使用

### 垃圾回收机制
- 垃圾回收机制GC会定期对内存中的内容进行回收，如果上下文中的内容没有被占用，那么GC就会将该上下文中的内容释放掉

Chrome：标记清除
低版本IE浏览器：引用计数，但是容易造成内存泄漏

### 闭包的缺点

- 闭包会保护私有变量不受外界所影响，但是会占用内存，造成内存泄漏
- 闭包会保存下级上下文中的私有变量，如果下级上下文中的私有变量过多，也会占用内存，造成内存泄漏

### 闭包的优点

- 保护私有变量不受外界所影响
- 保存了下级上下文中的私有变量，可以供下级上下文使用

### 闭包示例


### 示例

```js
let x = 5
function fn(x) {
	return function(y){
  	 console.log(y+(++x))
  }
}
let f = fn(6)
f(7)
fn(8)(9)
console.log(x)
```

![示例1](/images/notes/js/closure1.png)

```js
let a = 0, b = 0;
function A(a) {
	A = function (b) {
  	console.log(a+b++)
  }
  console.log(a++)
}
A(1)
A(2)
```
![示例2](/images/notes/js/closure2.png)

```js
function fun(n, o) {
    console.log(o);
    return {
        fun: function (m) {
            return fun(m, n);
        }
    };
}
var c = fun(0).fun(1);
c.fun(2);
c.fun(3);
```

![示例3](/images/notes/js/closure3.png)

### 闭包的应用场景（高阶函数）

- 函数防抖
在频繁触发的模式下，只识别一次（可以是第一次(immediate = true)，也可以是最后一次），用户可以自定义在多长时间内算是频繁触发

**思路**
1、每一次点击都设置一个定时器，间隔`wait`这么久执行`handler`
2、如果`wait`时间内再次点击，则清除上一次的定时器，重新设置一个定时器，间隔`wait`这么久执行`handler`
3、如果`wait`时间内没有再次点击，则执行`handler`,如果触发边界在开始，那么定时器不存在并且immediate=true，就立即执行

**实现**

```js
function debounce(handler, wait, immediate) {
  if (typeof handler !== "function") throw new TypeError('func must be a function!')
  if (typeof wait === "undefined") {
      wait = 500
      immediate = false
  }
  if (typeof wait === "boolean") {
      immediate = wait
      wait = 500
   }
  if (typeof wait !== "number") throw new TypeError('wait must be a number!')
  if (typeof immediate !== "boolean") throw new TypeError('immediate must be a boolean!')
	let timer = null
  let result = null
  return function proxy(...params) {
    let self = this
    // 只有当timer不存在并且immediate为true的时候才是[开始边界执行]
    let callNow = !timer && immediate
      // 如果再次执行的时候上一次的定时器还存在，就清空上一次的定时器，并且重新设置
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      // 清楚最后一次的定时器
      clearTimeout(timer)
      timer = null
      // 符合最后一次执行[结束边界执行]
      if (!immediate) result = handler.call(self, ...params)
    }, wait)
    if (callNow) result = handler.call(self, ...params)
  	return result
  }
}
```

- 函数节流
设置一个WAIT时间，此时间是用户自己定义，多久内触发多次算是频繁触发
函数节流：在频繁触发的模式下，我们每间隔WAIT这么久，就触发一次「节流的目的是降低触发频率」，一般的使用的地方在页面滚动

**思路**
1、获取上一次的时间和当前时间计算时间差
2、如果时间差小于0说明等待时间已经过了，立即执行，并且清除定时器，将上一次的时间设置成当前时间
3、如果时间差大于0，说明等待的时间还没有到，并且如果定时器存在说明上一次还没有执行，不需要在开启定时器

```js
function throttle(handler, wait) {
	if (typeof handler !== 'function') throw new TypeError('handler must be a function')
  wait = +wait
  if (isNaN(wait)) wait = 500
  let timer = null
  let previous = 0
  let result = null
  return function proxy(params){
		let now = +new Date // 获取当前时间
    let remaining = wait - (now - previous) // 计算等待时间和两次时间差的结果
    // 如果时间差小于0说明时间已经过了等待时间了,立即执行
    if (remaining <= 0) {
      if (timer) {
      	clearTimeout(timer)
        timer = null
      }
    	previous = now
      result = handler.apply(this, ...params)
      return result
    }
    // 没有定时器才设置，如果有定时器说明上一次的定时器还没有执行。上一次执行后才开启下一次定时器
    if (!timer) {
    	timer = setTimeout(() => {
        // 执行后清空定时器
        clearTimeout(timer)
        timer = null
        previous = +new Date
      	result = handler.apply(this, ...params)
      }, remaining)
    }
    return result
	}
}
```

- 函数柯里化(curring)

预先处理的思想：利用闭包，保存私有上下文中的一些信息，供其上下文中调取使用  -> 大函数执行返回小函数
如：fn(1,2,3,4,5,6) -> fn(1)(2)(3)(4)(5)(6)

```js
/*
let add = curring();
let res = add(1)(2)(3);
console.log(res); //->6

add = curring();
res = add(1, 2, 3)(4);
console.log(res); //->10

add = curring();
res = add(1)(2)(3)(4)(5);
const curring = () => {
  let arr = [] // 保存传递的参数
	const add = (...params) => {
  	arr = arr.concat(params)
    return add
  }
  add.toString = function () {
  	return arr.reduce((total, item) => total+item)
  }
  return add
}
*/
let add = curring(3);
let res = add(1)(2)(3);
console.log(res); //->6

add = curring(2);
res = add(1, 2, 3)(4);
console.log(res); //->10

add = curring(5);
res = add(1)(2)(3)(4)(5);
const curring = (n) => {
  // n -> 执行的次数
  // arr -> 保存传进来的参数
  // index -> 记录执行的次数
  let arr = []
  let index = 0
	const add = (...params) => {
  	arr = arr.concat(params)
    index++
    if (index === n) {
    	return arr.reduce((total, item) => total + item)
    }
  	return add
  }
  return add
}
```

- 函数记忆

- 惰性函数
一般情况
```js
function getCss (ele, attr) {
  // 处理兼容
	if (window.getComputedStyle) {
  	return window.getComputedStyle(ele)[attr]
  }
  return ele.getCurrentStyle[attr]
}
```
需求：一个超级复杂的业务函数，而且会被执行N次，后续执行，依然想使用第一次执行处理好的逻辑，这样我们不期望每一次执行，逻辑都重新判断一下，此时基于惰性思想「函数重构」可以实现性能的优化


```js
// 优化后的代码
function getCss (ele, attr) {
  // 处理兼容
	if (window.getComputedStyle) {
  	getCss = function (ele, attr) {
    	return window.getComputedStyle(ele)[attr]
    }
  } else {
  	getCss = function(ele, attr) {
    	return ele.currentStyle[attr]
    }
  }
  // 第一次函数重写后执行
  return getCss(ele, attr)
}
```

- 函数组合(compose)

把处理数据的函数像管道一样连接起来，然后将数据依次传递，最终得到一个结果

```js
// 函数组合
const add1 = x => x + 1;
const mul3 = x => x * 3;
const div2 = x => x / 2;
div2(mul3(add1(add1(0)))); //=>3
```

通过一个compose函数，接收任意多个函数作为参数，这些函数又都只接收一个参数，然后compose返回的也是一个函数，达到以下效果

```js
const operate = compose(div2, mul3, add1, add1)
operate(0) //=>相当于div2(mul3(add1(add1(0)))) 
operate(2) //=>相当于div2(mul3(add1(add1(2))))
```

```js
// lodash的方法
function compose(...funcs) {
  // 形如：const operate = compose()
	if (funcs.length === 0) {
		return args => args
	}
  // 形如：let add = x => x + 2
  // const operate = compose(add)
  if (funcs.length === 1) {
		return funcs[0]
	}
  return funcs.reduce((a, b) => {
		return ...args => {
    	return a(b(...args))
    }
	})
}

// 另外的实现
const compose1 = (...funcs) => {
    // funcs：未来需要执行的函数集合「执行顺序是从后到前」
    return x => {
        // x是执行第一个函数的初始实参值
        let len = funcs.length;
        if (len === 0) return x;
        if (len === 1) return funcs[0](x);
        // funcs -> [div2, mul3, add1, add1]
        return funcs.reduceRight((result, func) => {
            return func(result);
        }, x);
    };
};
```

## this分析

### 函数执行的主体
- 事件绑定
- 函数执行(普通函数、成员访问、匿名函数、回调函数...)
- 构造函数
- 箭头函数(generator生成器函数)
- 基于call/bind/apply强制修改this指向

### 全局上下文
 this -> windows

### 块级上下文/箭头函数
this -> 继承上级上下文中的this

### 事件绑定
```js

/* DOM0级事件绑定
xxx.onxxx = function () {}
DOM2级事件绑定
xxx.addEventListener('xxx', function(){}) // 不兼容IE6/7/8
xxx.attachEvent('onxxx', function(){}) // IE6/7/8
先创建函数，没有执行，当行为触发时执行函数，此时函数主体是元素本身，但是attachEvent方式中，方法执行时this是window
*/
document.body.addEventListener('click', function (e) {
  console.log(this); //->body
});
```

### 函数执行
- 正常函数执行
看函数前面有没有"点"，有的话“点”前面是谁this就是谁，没有的话this就是window(严格模式下是undefined)

```js
function fn () {
  console.log(this);
}
fn(); //->window
```
- 对象方法执行
看方法前面是谁this就是谁
```js
let obj = {
  fn: function () {
    console.log(this);
  }
}
obj.fn(); //->obj
```
- 构造函数执行
看new前面是谁this就是谁
```js
    function Fn() {
      console.log(this);
    }
    let f = new Fn();
    console.log(f);
```

- call/apply/bind
看第一个参数是谁this就是谁
```js
    function fn() {
      console.log(this);
    }
    fn.call(100); //->100
```

### 回调函数

一般是window/undefined,如果在函数执行过程中进行了特殊处理，如call/apply/bind等，那以自己处理的为主

```js
let arr = [10, 20, 30]
// forEach第二个参数是一个对象，改变this指向
arr.forEach(item => {
	console.log(this) // this -> window
})
arr.forEach(item => {
	console.log(this) // this -> {name: 'xxx'}
}, {name: 'xxx'})

```

### 箭头函数
- 箭头函数没有自己的this，箭头函数中的this继承的是上级上下文中的this
- 箭头函数没有`arguments`参数
- 箭头函数中的this指向是固定的，不能通过call()、apply()、bind()来修改this的指向

```js
    let obj = {
      fn: function () {
        console.log(this);
      }
    }
    obj.fn(); //->obj
    let fn = obj.fn;
    fn(); //->window
```

### 定时器
- 定时器中的this是window
- 定时器中的this指向是固定的，不能通过call()、apply()、bind()来修改this的指向
```js
    setTimeout(function (x) {
      console.log(this, x); // window  10
    }, 1000, 10);
```

### 立即执行函数
- 立即执行函数中的this是window
- 立即执行函数中的this指向的是window
```js
    (function () {
      console.log(this);
    })();
```

- 括号表达式
小括号包含多项，这样只取最后一项，但是this收到影响，一般是window/undefined
```js
(10, obj.fn())() // this-> window/undefined
```
    