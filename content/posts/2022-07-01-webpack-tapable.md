---
title: Webpack Tapable 事件流机制
date: 2022-07-01
category: 工程化
tags: [Webpack, Tapable]
summary: "Hook 类型可以分为同步Sync和异步Async,异步又分为并行和串行"
---

## webpack 的插件机制

- webpack 实现插件机制的方式
  - 创建 - webpack 在内部徐对象上创建各种钩子
  - 注册 - 插件将自己的方法注册到对应钩子上，交给 webpack
  - 调用 - webpack 编译过程中，会适时地触发相应钩子，也就触发了插件方法
- webpack 本质上是一种事件流机制，工作流程就是将各个插件串联起来，而实现这一切的核心就是 Tapable,webpack 中最核心负责编译的 Compiler 和负责创建 bundle 的 Compilation 都是 Tapable 的实例
- 通过事件的注册和监听，触发 webpack 生命周期中的函数方法

钩子有以下几个

```js
const {
  SyncHook,
  SyncBailHook,
  SyncWaterfallHook,
  SyncLoopHook,
  AsyncParallelHook,
  AsyncParallelBailHook,
  AsyncSeriesHook,
  AsyncSeriesBailHook,
  AsyncSeriesWaterfallHook,
} = require("tapable");
```

## tapable 分类

### 按同步异步分类

Hook 类型可以分为`同步Sync`和`异步Async`,异步又分为`并行`和`串行`

- 同步
  1. SyncHook:
  2. SyncBailHook:
  3. SyncWaterfallHook:
  4. SyncLoopHook:
- 异步
  - AsyncParallel
    1. AsyncParallelHook
    2. AsyncParallelBailHook
  - AsyncSeries
    1. AsyncSeriesHook
    2. AsyncSeriesBailHook
    3. AsyncSeriesWaterfallHook

![tapable](/images/notes/webpack/asynctapablesync.jpg)

### 按返回值分类

- Basic

1. SyncHook
2. AsyncParallelHook
3. AsyncSeriesHook

- Bail

1. SyncBailHook
2. AsyncParallelBailHook
3. AsyncSeriesBallHook

- Waterfall

1. SyncWaterfallHook
2. AsyncSeriesWaterfallHook

- Loop

1. SyncLoopHook

![tapable](/images/notes/webpack/mytapable.jpg)

#### Basic

- 执行每一个事件函数，不关心函数的返回值

![BasicTapable](/images/notes/webpack/BasicTapable.jpg)

#### Bail

- 执行每一个事件函数，遇到`第一个不为空的结果`就返回，不再继续执行。

![BailTapable](/images/notes/webpack/BailTapables.jpg)

#### Waterfall

- 如果前一个事件函数的结果不为空`result !== undefined`，则 result 会作为后一个事件函数的第一个参数

![WaterFALL](/images/notes/webpack/waterfallTapables.jpg)

#### Loop

- 不停的循环执行事件函数，直到所有函数结果`result === undefined`

![LoopTapable](/images/notes/webpack/LoopTapables3.jpg)

## tapable 使用

### SyncHook

- 同步钩子

- 所有的构造函数都接收一个可选参数，参数是一个参数名组成的字符串数组
- 参数名可以任意填写，但是参数数组长度必须要和实际接受的参数个数一致
- 如果回调函数不接收参数，可以传入空数组
- 在实例化的时候传入的数组长度有用，但是值没有用途
- 执行`call`时，参数个数和实例化时数组长度有关
- 回调的时候是按先入先出的顺序执行

```js
const { SyncHook } = require("tapable");
const hook = new SyncHook(["name", "age"]);
hook.tap("1", (name, age) => {
  console.log(1, name, age);
  return 1;
});
hook.tap("2", (name, age) => {
  console.log(2, name, age);
  return 2;
});
hook.tap("3", (name, age) => {
  console.log(3, name, age);
  return 3;
});

hook.call("test", 10);

/**
 *  1 test 10
 *  2 test 10
 *  3 test 10
 */
```

### SyncBailHook

- 同步保险钩子

- `BailHook` 中的回调函数也是顺序执行的
- 调用 `call` 时传入的参数也可以传给回调函数
- 当回调函数返回`非undefined`值的时候会停止调用后续的回调

```js
const { SyncBailHook } = require("tapable");
const hook = new SyncBailHook(["name", "age"]);
hook.tap("1", (name, age) => {
  console.log(1, name, age);
  //return 1;
});
hook.tap("2", (name, age) => {
  console.log(2, name, age);
  return 2;
});
hook.tap("3", (name, age) => {
  console.log(3, name, age);
  return 3;
});

hook.call("test", 10);
// 1 test 10
// 2 test 10
```

### SyncWaterfallHook

- 同步瀑布钩子

- `SyncWaterfallHook` 表示如果上一个回调函数的结果不为 undefined,则可以作为下一个回调函数的第一个参数
- 回调函数接受的参数来自于上一个函数的结果
- 调用 `call` 传入的第一个参数，会被上一个函数的`非undefined`结果替换
- 当回调函数返回 `非undefined` 不会停止回调栈的调用

```js
const { SyncWaterfallHook } = require("tapable");

const hook = new SyncWaterfallHook(["name", "age"]);
hook.tap("1", (name, age) => {
  console.log(1, name, age);
  return 1;
});
hook.tap("2", (name, age) => {
  console.log(2, name, age);
  return;
});
hook.tap("3", (name, age) => {
  console.log(3, name, age);
  return 3;
});

hook.call("test", 10);
// 1 test 10
// 2 1 10
// 3 1 10
```

### SyncLoopHook

- 同步循环钩子

- `SyncLoopHook` 的特点是不停的循环执行回调函数，直到函数结果是 `undefined`
- 要注意的是每次循环都是从头开始循环的

```js
const { SyncLoopHook } = require("tapable");
//当回调函数返回非undefined值的时候会停止调用后续的回调

let hook = new SyncLoopHook(["name", "age"]);
let counter1 = 0;
let counter2 = 0;
let counter3 = 0;
hook.tap("1", (name, age) => {
  console.log(1, "counter1", counter1);
  if (++counter1 == 1) {
    counter1 = 0;
    return;
  }
  return true;
});
hook.tap("2", (name, age) => {
  console.log(2, "counter2", counter2);
  if (++counter2 == 2) {
    counter2 = 0;
    return;
  }
  return true;
});
hook.tap("3", (name, age) => {
  console.log(3, "counter3", counter3);
  if (++counter3 == 3) {
    counter3 = 0;
    return;
  }
  return true;
});
hook.call("test", 10);
// 12 123 12 123 12 123
```

### AsyncParallelHook

- 异步并行钩子

#### tap 注册

```js
let { AsyncParallelHook } = require("tapable");
let queue = new AsyncParallelHook(["name"]);
console.time("cost");
queue.tap("1", function (name) {
  console.log(1);
});
queue.tap("2", function (name) {
  console.log(2);
});
queue.tap("3", function (name) {
  console.log(3);
});
queue.callAsync("test", (err) => {
  console.log(err);
  console.timeEnd("cost");
});
// 1
// 2
// 3
// undefined
// cost: 13.635ms
```

#### tapAsync 注册

- 异步注册，去阿奴任务完成后执行最终回调

```js
let { AsyncParallelHook } = require("tapable");
let queue = new AsyncParallelHook(["name"]);
console.time("cost");
queue.tapAsync("1", function (name, callback) {
  setTimeout(function () {
    console.log(1);
    callback();
  }, 1000);
});
queue.tapAsync("2", function (name, callback) {
  setTimeout(function () {
    console.log(2);
    callback();
  }, 2000);
});
queue.tapAsync("3", function (name, callback) {
  setTimeout(function () {
    console.log(3);
    callback();
  }, 3000);
});
queue.callAsync("test", (err) => {
  console.log(err);
  console.timeEnd("cost");
});
// 1
// 2
// 3
// undefined
// cost: 3.011s
```

#### tapPromise 注册

- promise 注册钩子，全部完成后执行才算成功

```js
let { AsyncParallelHook } = require("tapable");
let queue = new AsyncParallelHook(["name"]);
console.time("cost");
queue.tapPromise("1", function (name) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(1);
      resolve();
    }, 1000);
  });
});
queue.tapPromise("2", function (name) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(2);
      resolve();
    }, 2000);
  });
});
queue.tapPromise("3", function (name) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(3);
      resolve();
    }, 3000);
  });
});
queue.promise("test").then(() => {
  console.timeEnd("cost");
});
// 1
// 2
// 3
// cost: 3.015s
```

### AsyncParallelBailHook

- 异步并行保险

- 带保险的异步并行执行
- 有一个任务返回值不为`undefined`就直接结束
- 对于 promise 来说，resolve 还是 reject 并没有区别，区别在于是否传递参数

#### tap

```js
let { AsyncParallelBailHook } = require("tapable");
let queue = new AsyncParallelBailHook(["name"]);
console.time("cost");
queue.tap("1", function (name) {
  console.log(1);
  return "Wrong";
});
queue.tap("2", function (name) {
  console.log(2);
});
queue.tap("3", function (name) {
  console.log(3);
});
queue.callAsync("test", (err) => {
  console.log(err);
  console.timeEnd("cost");
});
// 1
// null
// cost: 22.781ms
```

#### tapAsync

```js
let { AsyncParallelBailHook } = require("tapable");
let queue = new AsyncParallelBailHook(["name"]);
console.time("cost");
queue.tapAsync("1", function (name, callback) {
  console.log(1);
  callback("Wrong");
});
queue.tapAsync("2", function (name, callback) {
  console.log(2);
  callback();
});
queue.tapAsync("3", function (name, callback) {
  console.log(3);
  callback();
});
queue.callAsync("test", (err) => {
  console.log(err);
  console.timeEnd("cost");
});
// 1
// Wrong
// cost: 9.156ms
```

#### tapPromise

```js
let { AsyncParallelBailHook } = require("tapable");
let queue = new AsyncParallelBailHook(["name"]);
console.time("cost");
queue.tapPromise("1", function (name) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(1);
      //对于promise来说，resolve还reject并没有区别
      //区别在于你是否传给它们的参数
      resolve(1);
    }, 1000);
  });
});
queue.tapPromise("2", function (name) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(2);
      resolve();
    }, 2000);
  });
});

queue.tapPromise("3", function (name) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(3);
      resolve();
    }, 3000);
  });
});

queue.promise("test").then(
  (result) => {
    console.log("成功", result);
    console.timeEnd("cost");
  },
  (err) => {
    console.error("失败", err);
    console.timeEnd("cost");
  }
);
// 1
// 成功 1
// cost: 1.017s
// 2
// 3
```

### AsyncSeriesHook

- 异步串行

- 任务一个一个执行,执行完上一个执行下一个

#### tapAsync

```js
let { AsyncSeriesHook } = require("tapable");
let queue = new AsyncSeriesHook(["name"]);
console.time("cost");
queue.tapAsync("1", function (name, callback) {
  setTimeout(function () {
    console.log(1);
  }, 1000);
});
queue.tapAsync("2", function (name, callback) {
  setTimeout(function () {
    console.log(2);
    callback();
  }, 2000);
});
queue.tapAsync("3", function (name, callback) {
  setTimeout(function () {
    console.log(3);
    callback();
  }, 3000);
});
queue.callAsync("test", (err) => {
  console.log(err);
  console.timeEnd("cost");
});
// 1
```

#### tapPromise

```js
let { AsyncSeriesHook } = require("tapable");
let queue = new AsyncSeriesHook(["name"]);
console.time("cost");
queue.tapPromise("1", function (name) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log(1, name);
      resolve();
    }, 1000);
  });
});
queue.tapPromise("2", function (name) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log(2, name);
      resolve();
    }, 2000);
  });
});
queue.tapPromise("3", function (name) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log(3, name);
      resolve();
    }, 3000);
  });
});
queue.promise("test").then((data) => {
  console.log(data);
  console.timeEnd("cost");
});
// 1 test
// 2 test
// 3 test
// undefined
// cost: 6.065s
```

### AsyncSeriesBailHook

- 异步串行保险

- 只要有一个返回了`非undefined`的值就直接结束

#### tapAsync

```js
let { AsyncSeriesBailHook } = require("tapable");
let queue = new AsyncSeriesBailHook(["name"]);
console.time("cost");
queue.tapAsync("1", function (name, callback) {
  setTimeout(function () {
    console.log(1);
    callback("wrong");
  }, 1000);
});
queue.tapAsync("2", function (name, callback) {
  setTimeout(function () {
    console.log(2);
    callback();
  }, 2000);
});
queue.tapAsync("3", function (name, callback) {
  setTimeout(function () {
    console.log(3);
    callback();
  }, 3000);
});
queue.callAsync("test", (err) => {
  console.log(err);
  console.timeEnd("cost");
});
// 1
// wrong
// cost: 1.019s
```

#### tapPromise

```js
let { AsyncSeriesBailHook } = require("tapable");
let queue = new AsyncSeriesBailHook(["name"]);
console.time("cost");
queue.tapPromise("1", function (name) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log(1);
      resolve();
    }, 1000);
  });
});
queue.tapPromise("2", function (name, callback) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(2);
      reject("失败了");
    }, 2000);
  });
});
queue.tapPromise("3", function (name, callback) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log(3);
      resolve();
    }, 3000);
  });
});
queue.promise("test").then(
  (data) => {
    console.log(data);
    console.timeEnd("cost");
  },
  (error) => {
    console.log(error);
    console.timeEnd("cost");
  }
);
// 1
// 2
// 失败了
// cost: 3.025s
```

### AsyncSeriesWaterfallHook

- 异步瀑布

- 只要有一个返回了`非undefined` 的值就直接结束

#### tapAsync

```js
let { AsyncSeriesWaterfallHook } = require("tapable");
let queue = new AsyncSeriesWaterfallHook(["name", "age"]);
console.time("cost");
queue.tapAsync("1", function (name, age, callback) {
  setTimeout(function () {
    console.log(1, name, age);
    callback(null, 1);
  }, 1000);
});
queue.tapAsync("2", function (data, age, callback) {
  setTimeout(function () {
    console.log(2, data, age);
    callback(null, 2);
  }, 2000);
});
queue.tapAsync("3", function (data, age, callback) {
  setTimeout(function () {
    console.log(3, data, age);
    callback(null, 3);
  }, 3000);
});
queue.callAsync("test", 10, (err, data) => {
  console.log(err, data);
  console.timeEnd("cost");
});
// 1 test 10
// 2 1 10
// 3 2 10
// null 3
// cost: 6.033s
```

#### tapPromise

```js
let { AsyncSeriesWaterfallHook } = require("tapable");
let queue = new AsyncSeriesWaterfallHook(["name"]);
console.time("cost");
queue.tapPromise("1", function (name) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log(name, 1);
      resolve(1);
    }, 1000);
  });
});
queue.tapPromise("2", function (data) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log(data, 2);
      resolve(2);
    }, 2000);
  });
});
queue.tapPromise("3", function (data) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log(data, 3);
      resolve(3);
    }, 3000);
  });
});
queue.promise("test").then((err) => {
  console.timeEnd("cost");
});
// test 1
// 1 2
// 2 3
// cost: 6.049s
```

## tapable 实现

![实现原理图](/images/notes/webpack/tapable-source.png)

> 只实现了成功，没有考虑失败的情况，具体源代码生成的`call`,`callAsync`,`promise`方法调整`HookCodeFactory`中的`create`以及`callTaps`即可

### SyncHook

- 同步实现

**SyncHook.js**

```js
const Hook = require("./Hook");
const HookCodeFactory = require("./HookCodeFactory");
class SyncHookCodeFactory extends HookCodeFactory {
  content() {
    return this.callTapsSeries();
  }
}
let factory = new SyncHookCodeFactory();
class SyncHook extends Hook {
  compile(options) {
    // 这一步的作用:hook._x = [fn1, fn2, fn3]
    factory.setUp(this, options);
    // 创建代码
    return factory.create(options);
  }
}

module.exports = SyncHook;
```

**Hook.js**

```js
const { SYNC } = require("./types");
class Hook {
  constructor(args) {
    this.args = Array.isArray(args) ? args : []; // 参数列表
    this._x = null;
    this.taps = []; // 用来存放回调函数
    this.call = CALL_DELEGATE;
  }
  tap(options, fn) {
    this._tap(SYNC, options, fn);
  }
  _tap(type, options, fn) {
    if (typeof options === "string") {
      options = { name: options };
    }
    const tapInfo = { ...options, type, fn };
    this._insert(tapInfo);
  }
  _insert(tapInfo) {
    this.taps.push(tapInfo);
  }
  compile(options) {
    throw new Error("由于每个子类的编译方式不同，此方法需要由子类实现");
  }
  _createCall(type) {
    return this.compile({
      taps: this.taps,
      args: this.args,
      type,
    });
  }
}

const CALL_DELEGATE = function (...args) {
  // 动态创建call方法，this.call = 生成的一个函数
  this.call = this._createCall(SYNC);
  return this.call(...args);
};
module.exports = Hook;
```

**types.js**

```js
const SYNC = "SYNC";
exports.SYNC = SYNC;
```

**HookCodeFactory.js**

```js
const { SYNC } = require("./types");
class HookCodeFactory {
  setUp(hookInstance, options) {
    // this._x = [fn1, fn2, fn3]
    hookInstance._x = options.taps.map((tapInfo) => tapInfo.fn);
  }
  init(options) {
    this.options = options;
  }
  args() {
    const { args } = this.options;
    return args.join(",");
  }
  header() {
    let code = "";
    code += `var _x = this._x;\n`;
    console.log(code, "header");
    return code;
  }
  create(options) {
    this.init(options);
    let fn;
    switch (this.options.type) {
      case SYNC:
        fn = new Function(this.args(), this.header() + this.content());
        break;
      default:
        break;
    }
    return fn;
  }
  callTapsSeries() {
    const { taps } = this.options;
    if (!taps.length) return "";
    let code = "";
    for (let i = 0; i < taps.length; i++) {
      const content = this.callTaps(i);
      code += content;
    }
    console.log(code, "content");
    return code;
  }
  callTaps(tapIndex) {
    let code = "";
    code += `var _fn${tapIndex} = _x[${tapIndex}];\n`;
    const tapInfo = this.options.taps[tapIndex];
    switch (tapInfo.type) {
      case SYNC:
        code += `_fn${tapIndex}(${this.args()});\n`;
        break;
      default:
        break;
    }
    return code;
  }
}

module.exports = HookCodeFactory;
```

### AsyncParallelHook Async 实现

**AsyncParallelHook.js**

```js
const Hook = require("./Hook");
const HookCodeFactory = require("./HookCodeFactory");
class SyncHookCodeFactory extends HookCodeFactory {
  content() {
    return this.callTapsParallel();
  }
}
let factory = new SyncHookCodeFactory();
class AsyncParallelHook extends Hook {
  compile(options) {
    factory.setUp(this, options); // 这一步的作用:hook._x = [fn1, fn2, fn3]
    return factory.create(options);
  }
}

module.exports = AsyncParallelHook;
```

**Hook.js**

```js{1,8,13-15,43-46}
const { SYNC, ASYNC } = require("./types");
class Hook {
  constructor(args) {
    this.args = Array.isArray(args) ? args : []; // 参数列表
    this._x = null;
    this.taps = []; // 用来存放回调函数
    this.call = CALL_DELEGATE;
    this.callAsync = CALL_ASYNC_DELEGATE;
  }
  tap(options, fn) {
    this._tap(SYNC, options, fn);
  }
  tapAsync(options, fn) {
    this._tap(ASYNC, options, fn);
  }
  _tap(type, options, fn) {
    if (typeof options === "string") {
      options = { name: options };
    }
    const tapInfo = { ...options, type, fn };
    this._insert(tapInfo);
  }
  _insert(tapInfo) {
    this.taps.push(tapInfo);
  }
  compile(options) {
    throw new Error("由于每个子类的编译方式不同，此方法需要由子类实现");
  }
  _createCall(type) {
    return this.compile({
      taps: this.taps,
      args: this.args,
      type,
    });
  }
}

const CALL_DELEGATE = function (...args) {
  // 动态创建call方法，this.call = 生成的一个函数
  this.call = this._createCall(SYNC);
  return this.call(...args);
};
const CALL_ASYNC_DELEGATE = function (...args) {
  this.call = this._createCall(ASYNC);
  return this.call(...args);
};
module.exports = Hook;
```

**types.js**

```js{2,4}
const SYNC = "SYNC";
const ASYNC = "ASYNC";
exports.SYNC = SYNC;
exports.ASYNC = ASYNC;
```

**HookCodeFactory.js**

```js{1,11-20,34-39,46-57,77-82}
const { SYNC, ASYNC } = require("./types");
class HookCodeFactory {
  setUp(hookInstance, options) {
    // this._x = [fn1, fn2, fn3]
    hookInstance._x = options.taps.map((tapInfo) => tapInfo.fn);
  }
  init(options) {
    this.options = options;
  }
  args(options = {}) {
    // option：向前还是向后添加参数
    const { after, before } = options;
    let allArgs = this.options.args || [];
    if (before) {
      allArgs = [before, ...allArgs];
    }
    if (after) {
      allArgs = [...allArgs, after];
    }
    return allArgs.join(","); // before,name,age,after
  }
  header() {
    let code = "";
    code += `var _x = this._x;\n`;
    return code;
  }
  create(options) {
    this.init(options);
    let fn;
    switch (this.options.type) {
      case SYNC:
        fn = new Function(this.args(), this.header() + this.content());
        break;
      case ASYNC:
        fn = new Function(
          this.args({ after: "_callback" }),
          this.header() + this.content()
        );
        break;
      default:
        break;
    }
    return fn;
  }
  // 并行方式
  callTapsParallel() {
    const taps = this.options.taps;
    let code = `var _counter = ${taps.length};\n
    var _done = (function () {
      _callback();
    });\n`;
    for (let i = 0; i < taps.length; i++) {
      const content = this.callTaps(i);
      code += content;
    }
    return code;
  }
  // 串行方式
  callTapsSeries() {
    const { taps } = this.options;
    if (!taps.length) return "";
    let code = "";
    for (let i = 0; i < taps.length; i++) {
      const content = this.callTaps(i);
      code += content;
    }
    return code;
  }
  callTaps(tapIndex) {
    let code = "";
    code += `var _fn${tapIndex} = _x[${tapIndex}];\n`;
    const tapInfo = this.options.taps[tapIndex];
    switch (tapInfo.type) {
      case SYNC:
        code += `_fn${tapIndex}(${this.args()});\n`;
        break;
      case ASYNC:
        code += ` var _fn${tapIndex} = _x[${tapIndex}];
        _fn${tapIndex}(${this.args()}, (function () {
          if (--_counter === 0) _done();
        }));`;
        break;
      default:
        break;
    }
    return code;
  }
}

module.exports = HookCodeFactory;
```

### AsyncParallelHook Promise 实现

**AsyncParallelHook.js**

```js{4-6}
const Hook = require("./Hook");
const HookCodeFactory = require("./HookCodeFactory");
class SyncHookCodeFactory extends HookCodeFactory {
  content({ onDone }) {
    return this.callTapsParallel({ onDone })
  }
}
let factory = new SyncHookCodeFactory();
class AsyncParallelHook extends Hook {
  compile(options) {
    factory.setUp(this, options); // 这一步的作用:hook._x = [fn1, fn2, fn3]
    return factory.create(options);
  }
}

module.exports = AsyncParallelHook;
```

**Hook.js**

```js{1,9,17-19,51-54}
const { SYNC, ASYNC, PROMISE } = require("./types");
class Hook {
  constructor(args) {
    this.args = Array.isArray(args) ? args : []; // 参数列表
    this._x = null;
    this.taps = []; // 用来存放回调函数
    this.call = CALL_DELEGATE;
    this.callAsync = CALL_ASYNC_DELEGATE;
    this.promise = PROMISE_DELEGATE;
  }
  tap(options, fn) {
    this._tap(SYNC, options, fn);
  }
  tapAsync(options, fn) {
    this._tap(ASYNC, options, fn);
  }
  tapPromise(options, fn) {
    this._tap(PROMISE, options, fn);
  }
  _tap(type, options, fn) {
    if (typeof options === "string") {
      options = { name: options };
    }
    const tapInfo = { ...options, type, fn };
    this._insert(tapInfo);
  }
  _insert(tapInfo) {
    this.taps.push(tapInfo);
  }
  compile(options) {
    throw new Error("由于每个子类的编译方式不同，此方法需要由子类实现");
  }
  _createCall(type) {
    return this.compile({
      taps: this.taps,
      args: this.args,
      type,
    });
  }
}

const CALL_DELEGATE = function (...args) {
  // 动态创建call方法，this.call = 生成的一个函数
  this.call = this._createCall(SYNC);
  return this.call(...args);
};
const CALL_ASYNC_DELEGATE = function (...args) {
  this.call = this._createCall(ASYNC);
  return this.call(...args);
};
const PROMISE_DELEGATE = function (...args) {
  this.call = this._createCall(PROMISE);
  return this.call(...args);
};
module.exports = Hook;
```

**types.js**

```js{3,6}
const SYNC = "SYNC";
const ASYNC = "ASYNC";
const PROMISE = "PROMISE";
exports.SYNC = SYNC;
exports.ASYNC = ASYNC;
exports.PROMISE = PROMISE;
```

**HookCodeFactory.js**

```js{1,34,40,43-52,59,63,96-104}
const { SYNC, ASYNC } = require("./types");
class HookCodeFactory {
  setUp(hookInstance, options) {
    // this._x = [fn1, fn2, fn3]
    hookInstance._x = options.taps.map((tapInfo) => tapInfo.fn);
  }
  init(options) {
    this.options = options;
  }
  args(options = {}) {
    // option：向前还是向后添加参数
    const { after, before } = options;
    let allArgs = this.options.args || [];
    if (before) {
      allArgs = [before, ...allArgs];
    }
    if (after) {
      allArgs = [...allArgs, after];
    }
    return allArgs.join(","); // before,name,age,after
  }
  header() {
    let code = "";
    code += `var _x = this._x;\n`;
    return code;
  }
  create(options) {
    this.init(options);
    let fn;
    switch (this.options.type) {
      case SYNC:
        fn = new Function(
          this.args(),
          this.header() + this.content({ onDone: () => `_callback();\n` })
        )
        break
      case ASYNC:
        fn = new Function(
          this.args({ after: '_callback' }),
          this.header() + this.content({ onDone: () => `_callback();\n` })
        )
        break
      case PROMISE:
        const tapContent = this.content({ onDone: () => `_resolve();\n` });
        let content = `return new Promise((_resolve, _reject) => {
          ${tapContent}
        })`
        fn = new Function(
          this.args(),
          this.header() + content
        )
        break
      default:
        break;
    }
    return fn;
  }
  // 并行方式
  callTapsParallel({ onDone }) {
    const taps = this.options.taps;
    let code = `var _counter = ${taps.length};\n
    var _done = (function () {
      ${onDone()};
    });\n`
    for (let i = 0; i < taps.length; i++) {
      const content = this.callTaps(i);
      code += content;
    }
    return code;
  }
  // 串行方式
  callTapsSeries() {
    const { taps } = this.options;
    if (!taps.length) return "";
    let code = "";
    for (let i = 0; i < taps.length; i++) {
      const content = this.callTaps(i);
      code += content;
    }
    return code;
  }
  callTaps(tapIndex) {
    let code = "";
    code += `var _fn${tapIndex} = _x[${tapIndex}];\n`;
    const tapInfo = this.options.taps[tapIndex];
    switch (tapInfo.type) {
      case SYNC:
        code += `_fn${tapIndex}(${this.args()});\n`;
        break;
      case ASYNC:
        code += ` var _fn${tapIndex} = _x[${tapIndex}];
        _fn${tapIndex}(${this.args()}, (function () {
          if (--_counter === 0) _done();
        }));`;
        break;
      case PROMISE:
        code += `
        var _fn${tapIndex} = _x[${tapIndex}];
        var _promise${tapIndex} = _fn${tapIndex}(${this.args()});
        _promise${tapIndex}.then((function (_result${tapIndex}) {
          if (--_counter === 0) _done();
        }));
        `
        break
      default:
        break;
    }
    return code;
  }
}

module.exports = HookCodeFactory;
```

## interceptor

- 所有的钩子都提供了额外的拦截器 API
  - register：(tap: Tap) => Tap | undefined , 每注册一个函数都会触发 interceptor 上的 register,下一个拦截器的 register 函数得到的参数取决于上一个 register 返回的值，所以最好返回一个 tap 钩子
  - call: (...args) => void, 当钩子触发之前(就是 call())触发这个函数，可以访问钩子的参数，多个钩子执行一次，每个拦截器执行一次
  - tap: (tap: Tap) => void, 每个钩子执行前会触发这个函数
- Context(上下文): 插件和拦截器都可以选择加入一个可选的 context 对象, 这个可以被用于传递随意的值到队列中的插件和拦截器

### 使用

```js
const { SyncHook } = require("../tapable");
const hook = new SyncHook(["name"]);
hook.intercept({
  register(tapInfo) {
    // 注册拦截器，当通过tap，tapAsync, promise的时候触发
    console.log("intercept1 register", tapInfo.name);
    return tapInfo;
  },
  call(name) {
    // 调用call，callAsync,promise的时候触发，所有回调只触发一次
    console.log("intercept1 call", name);
  },
  tap(tapInfo) {
    // 调用回调的时候每个回调都会触发
    console.log("intercept1 tap", tapInfo.name);
  },
});
hook.intercept({
  register(tapInfo) {
    // 注册拦截器，当通过tap，tapAsync, promise的时候触发
    console.log("intercept2 register", tapInfo.name);
  },
  call(name) {
    // 调用call，callAsync,promise的时候触发
    console.log("intercept2 call", name);
  },
  tap(tapInfo) {
    // 调用回调的时候触发
    console.log("intercept2 tap", tapInfo.name);
  },
});
hook.tap("1", (name) => {
  console.log("1", name);
});
hook.tap("2", (name) => {
  console.log("2", name);
});
hook.call("test");
/* intercept1 register 1
intercept2 register 1
intercept1 register 2
intercept2 register 2
intercept1 call test
intercept2 call test
intercept1 tap 1
intercept2 tap 1
1 test
intercept1 tap 2
intercept2 tap 2
2 test */
```

**\_createCall 生成的代码**

```js
(function anonymous(name, age) {
  var _x = this._x;
  var _taps = this.taps;

  var _interceptors = this.interceptors;
  _interceptors[0].call(name, age);
  _interceptors[1].call(name, age);

  var _tap0 = _taps[0];
  _interceptors[0].tap(_tap0);
  _interceptors[1].tap(_tap0);
  var _fn0 = _x[0];
  _fn0(name, age);

  var _tap1 = _taps[1];
  _interceptors[0].tap(_tap1);
  _interceptors[1].tap(_tap1);
  var _fn1 = _x[1];
  _fn1(name, age);
});
```

### 实现

**Hook.js**

```js{10,12-14,29,32-37,49}
const { SYNC, ASYNC, PROMISE } = require("./types");
class Hook {
  constructor(args) {
    this.args = Array.isArray(args) ? args : []; // 参数列表
    this.taps = []; // 用来存放回调函数
    this._x = null;
    this.call = CALL_DELEGATE;
    this.callAsync = CALL_ASYNC_DELEGATE;
    this.promise = PROMISE_DELEGATE;
    this.interceptors = []; // 拦截器数组
  }
  intercept(interceptor) {
    this.interceptors.push(interceptor);
  }
  tap(options, fn) {
    this._tap(SYNC, options, fn);
  }
  tapAsync(options, fn) {
    this._tap(ASYNC, options, fn);
  }
  tapPromise(options, fn) {
    this._tap(PROMISE, options, fn);
  }
  _tap(type, options, fn) {
    if (typeof options === "string") {
      options = { name: options };
    }
    const tapInfo = { ...options, type, fn };
    this.runRegisterInterceptors(tapInfo);
    this._insert(tapInfo);
  }
  runRegisterInterceptors(tapInfo) {
    // 运行注册拦截器
    for (const interceptor of this.interceptors) {
      if (interceptor.register) interceptor.register(tapInfo);
    }
  }
  _insert(tapInfo) {
    this.taps.push(tapInfo);
  }
  compile(options) {
    throw new Error("由于每个子类的编译方式不同，此方法需要由子类实现");
  }
  _createCall(type) {
    return this.compile({
      taps: this.taps,
      args: this.args,
      type,
      interceptors: this.interceptors,
    });
  }
}

const CALL_DELEGATE = function (...args) {
  // 动态创建call方法，this.call = 生成的一个函数
  this.call = this._createCall(SYNC);
  return this.call(...args);
};
const CALL_ASYNC_DELEGATE = function (...args) {
  this.call = this._createCall(ASYNC);
  return this.call(...args);
};
const PROMISE_DELEGATE = function (...args) {
  this.promise = this._createCall(PROMISE);
  return this.promise(...args);
};
module.exports = Hook;
```

**HookCodeFactory.js**

```js{25-34,94-103}
const { SYNC, ASYNC, PROMISE } = require('./types')
class HookCodeFactory {
  setUp(hookInstance, options) {
    // this._x = [fn1, fn2, fn3]
    hookInstance._x = options.taps.map(tapInfo => tapInfo.fn);
  }
  init(options) {
    this.options = options
  }
  args(options = {}) {
    // option：向前还是向后添加参数
    const { after, before } = options;
    let allArgs = this.options.args || []
    if (before) {
      allArgs = [before, ...allArgs]
    }
    if (after) {
      allArgs = [...allArgs, after]
    }
    return allArgs.join(',') // before,name,age,after
  }
  header() {
    let code = '';
    code += `var _x = this._x;\n`;
    const { interceptors = [] } = this.options;
    if (interceptors.length) {
      code += `var _taps = this.taps;\n`;
      code += `var _interceptors = this.interceptors;\n`;
      for (let i = 0; i < interceptors.length; i++) {
        if (interceptors[i].call) {
          code += `_interceptors[${i}].call(${this.args()});\n`
        }
      }
    }
    return code
  }
  create(options) { // 创建代码
    this.init(options);
    let fn;
    switch (this.options.type) {
      case SYNC:
        fn = new Function(
          this.args(),
          this.header() + this.content({ onDone: () => `_callback();\n` })
        )
        break
      case ASYNC:
        fn = new Function(
          this.args({ after: '_callback' }),
          this.header() + this.content({ onDone: () => `_callback();\n` })
        )
        break
      case PROMISE:
        const tapContent = this.content({ onDone: () => `_resolve();\n` });
        let content = `return new Promise((_resolve, _reject) => {
          ${tapContent}
        })`
        fn = new Function(
          this.args(),
          this.header() + content
        )
        break
      default:
        break
    }
    return fn
  }
  // 并行方式
  callTapsParallel({ onDone }) {
    const taps = this.options.taps;
    let code = `var _counter = ${taps.length};\n
    var _done = (function () {
      ${onDone()};
    });\n`
    for (let i = 0; i < taps.length; i++) {
      const content = this.callTaps(i)
      code += content
    }
    return code
  }
  // 串行方式
  callTapsSeries() {
    const { taps } = this.options;
    if (!taps.length) return ''
    let code = '';
    for (let i = 0; i < taps.length; i++) {
      const content = this.callTaps(i);
      code += content
    }
    return code
  }
  callTaps(tapIndex) {
    let code = '';
    const { interceptors = [] } = this.options;
    if (interceptors.length) {
      code += `var _tap${tapIndex} = _taps[${tapIndex}];\n`
      for (let i = 0; i < interceptors.length; i++) {
        if (interceptors[i].tap) {
          code += `_interceptors[${i}].tap(_tap${tapIndex});\n`
        }
      }
    }
    code += `var _fn${tapIndex} = _x[${tapIndex}];\n`;
    // 每种类型对应的代码参考call文件夹
    const tapInfo = this.options.taps[tapIndex];
    switch (tapInfo.type) {
      case SYNC:
        code += `_fn${tapIndex}(${this.args()});\n`;
        break
      case ASYNC:
        code += ` var _fn${tapIndex} = _x[${tapIndex}];
        _fn${tapIndex}(${this.args()}, (function () {
          if (--_counter === 0) _done();
        }));`
        break
      case PROMISE:
        code += `
        var _fn${tapIndex} = _x[${tapIndex}];
        var _promise${tapIndex} = _fn${tapIndex}(${this.args()});
        _promise${tapIndex}.then((function (_result${tapIndex}) {
          if (--_counter === 0) _done();
        }));
        `
        break
      default:
        break
    }

    return code
  }
}

module.exports = HookCodeFactory
```

## HookMap

- Hook 的 映射
  **HookMapUse.js**

```js
const { SyncHook, HookMap } = require("../tapable");

const hookMap = new HookMap(() => new SyncHook(["name"]));
hookMap.for("key1").tap("plugin1", (name) => console.log("key1", name));
hookMap.for("key1").tap("plugin2", (name) => console.log("key1", name));

hookMap.for("key2").tap("plugin1", (name) => console.log("key2", name));
hookMap.for("key2").tap("plugin2", (name) => console.log("key2", name));

const hook1 = hookMap.get("key1");
const hook2 = hookMap.get("key2");
hook1.call("test1");
hook2.call("test2");
/*
key1 test1
key1 test1
key2 test2
key2 test2
*/
```

**HookMap.js**

```js
class HookMap {
  constructor(factory) {
    this.map = new Map();
    this.factory = factory; // new SyncHook(['name'])
  }
  get(key) {
    return this.map.get(key);
  }
  for(key) {
    let hook = this.get(key);
    if (!hook) {
      hook = this.factory();
      this.map.set(key, hook);
    }
    return hook;
  }
}

module.exports = HookMap;
```

## Stage

- tap 回调排序，数值越小先执行

**StageUse.js**

```js
const { SyncHook } = require("tapable");
const hook = new SyncHook(["name"]);
hook.tap({ name: "1", stage: 1 }, () => console.log(1));
hook.tap({ name: "5", stage: 5 }, () => console.log(5));
hook.tap({ name: "2", stage: 2 }, () => console.log(2));

hook.call("test");
/* 
1
2
5 */
```

**Hook.js**

```js{39-62}
const { SYNC, ASYNC, PROMISE } = require("./types");
class Hook {
  constructor(args) {
    this.args = Array.isArray(args) ? args : []; // 参数列表
    this.taps = []; // 用来存放回调函数
    this._x = null;
    this.call = CALL_DELEGATE;
    this.callAsync = CALL_ASYNC_DELEGATE;
    this.promise = PROMISE_DELEGATE;
    this.interceptors = []; // 拦截器数组
  }
  intercept(interceptor) {
    this.interceptors.push(interceptor);
  }
  tap(options, fn) {
    this._tap(SYNC, options, fn);
  }
  tapAsync(options, fn) {
    this._tap(ASYNC, options, fn);
  }
  tapPromise(options, fn) {
    this._tap(PROMISE, options, fn);
  }
  _tap(type, options, fn) {
    if (typeof options === "string") {
      options = { name: options };
    }
    const tapInfo = { ...options, type, fn };
    this.runRegisterInterceptors(tapInfo);
    this._insert(tapInfo);
  }
  runRegisterInterceptors(tapInfo) {
    // 运行注册拦截器
    for (const interceptor of this.interceptors) {
      if (interceptor.register) interceptor.register(tapInfo);
    }
  }
  _insert(tapInfo) {
    // stage实现
    // [1,3,5] => 插入2 => [1,2,3,5]
    let stage = 0;
    if (typeof tapInfo.stage === "number") {
      stage = tapInfo.stage || 0;
    }
    let len = this.taps.length;
    while (len > 0) {
      /**
       * 第一次循环 len = 2 x = 5, taps => [1,3,5,5] continue
       * 第二次循环 len = 1 x = 3, taps => [1,3,3,5] continue
       * 第三次循环 len = 0 x = 1, taps => [1,1,3,5] len = 1 break
       * [1,2,3,5]
       */
      len--;
      let x = this.taps[len];
      this.taps[len + 1] = x;
      if (x.stage > stage) {
        continue;
      }
      len++;
      break;
    }
    this.taps[len] = tapInfo;
  }
  compile(options) {
    throw new Error("由于每个子类的编译方式不同，此方法需要由子类实现");
  }
  _createCall(type) {
    return this.compile({
      taps: this.taps,
      args: this.args,
      type,
      interceptors: this.interceptors,
    });
  }
}

const CALL_DELEGATE = function (...args) {
  // 动态创建call方法，this.call = 生成的一个函数
  this.call = this._createCall(SYNC);
  return this.call(...args);
};
const CALL_ASYNC_DELEGATE = function (...args) {
  this.call = this._createCall(ASYNC);
  return this.call(...args);
};
const PROMISE_DELEGATE = function (...args) {
  this.promise = this._createCall(PROMISE);
  return this.promise(...args);
};
module.exports = Hook;
```

## Before

- 在 xxx 之前，可以是字符串或者数组

**Before.js**

```js
const { SyncHook } = require("tapable");
const hook = new SyncHook(["name"]);
hook.tap({ name: "1", stage: 1 }, () => console.log(1));
hook.tap({ name: "5", stage: 5 }, () => console.log(5));
hook.tap({ name: "2", stage: 2 }, () => console.log(2));
hook.tap({ name: "4", stage: 4 }, () => console.log(4));
hook.tap({ name: "7", stage: 7 }, () => console.log(7));
hook.tap({ name: "6", before: ["4", "7"], stage: 6 }, () => console.log(6));

hook.call("test");
/* 1
2
6
4
5
7 */
```

**Hook.js**

```js{39-45,63-71}
const { SYNC, ASYNC, PROMISE } = require("./types");
class Hook {
  constructor(args) {
    this.args = Array.isArray(args) ? args : []; // 参数列表
    this.taps = []; // 用来存放回调函数
    this._x = null;
    this.call = CALL_DELEGATE;
    this.callAsync = CALL_ASYNC_DELEGATE;
    this.promise = PROMISE_DELEGATE;
    this.interceptors = []; // 拦截器数组
  }
  intercept(interceptor) {
    this.interceptors.push(interceptor);
  }
  tap(options, fn) {
    this._tap(SYNC, options, fn);
  }
  tapAsync(options, fn) {
    this._tap(ASYNC, options, fn);
  }
  tapPromise(options, fn) {
    this._tap(PROMISE, options, fn);
  }
  _tap(type, options, fn) {
    if (typeof options === "string") {
      options = { name: options };
    }
    const tapInfo = { ...options, type, fn };
    this.runRegisterInterceptors(tapInfo);
    this._insert(tapInfo);
  }
  runRegisterInterceptors(tapInfo) {
    // 运行注册拦截器
    for (const interceptor of this.interceptors) {
      if (interceptor.register) interceptor.register(tapInfo);
    }
  }
  _insert(tapInfo) {
    // before实现
    let before;
    if (Array.isArray(tapInfo.before)) {
      before = new Set(tapInfo.before);
    } else if (typeof tapInfo.before === "string") {
      before = new Set([tapInfo.before]);
    }
    // stage实现
    // [1,3,5] => 插入2 => [1,2,3,5]
    let stage = 0;
    if (typeof tapInfo.stage === "number") {
      stage = tapInfo.stage || 0;
    }
    let len = this.taps.length;
    while (len > 0) {
      /**
       * 第一次循环 len = 2 x = 5, taps => [1,3,5,5] continue
       * 第二次循环 len = 1 x = 3, taps => [1,3,3,5] continue
       * 第三次循环 len = 0 x = 1, taps => [1,1,3,5] len = 1 break
       * [1,2,3,5]
       */
      len--;
      let x = this.taps[len];
      this.taps[len + 1] = x;
      if (before) {
        if (before.has(x.name)) {
          before.delete(x.name);
          continue;
        }
        if (before.size > 0) {
          continue;
        }
      }
      if (x.stage > stage) {
        continue;
      }
      len++;
      break;
    }
    this.taps[len] = tapInfo;
  }
  compile(options) {
    throw new Error("由于每个子类的编译方式不同，此方法需要由子类实现");
  }
  _createCall(type) {
    return this.compile({
      taps: this.taps,
      args: this.args,
      type,
      interceptors: this.interceptors,
    });
  }
}

const CALL_DELEGATE = function (...args) {
  // 动态创建call方法，this.call = 生成的一个函数
  this.call = this._createCall(SYNC);
  return this.call(...args);
};
const CALL_ASYNC_DELEGATE = function (...args) {
  this.call = this._createCall(ASYNC);
  return this.call(...args);
};
const PROMISE_DELEGATE = function (...args) {
  this.promise = this._createCall(PROMISE);
  return this.promise(...args);
};
module.exports = Hook;
```
