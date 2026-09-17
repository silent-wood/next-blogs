---
title: Webpack Bundle 分析
date: 2022-06-16
category: 工程化
tags: [Webpack]
---

> 打包文件分析辅助 vscode 插件 `rm-js-comment`

## 前置知识

### Symbol.toStringTag

- `Symbol.toStringTag` 是内置的 symbol 属性，通常作为对象的属性 key 使用，对应的值为字符串，用来定义表示该对象的类型
- 通常使用`Object.prototype.toString` 方法获取

```js
Object.prototype.toString.call(1); // [object Number]
Object.prototype.toString.call("1"); // [object String]
Object.prototype.toString.call(true); // [object Boolean]
Object.prototype.toString.call([]); // [object Array]
Object.prototype.toString.call({}); // [object Object]
let obj = {};
Object.defineProperty(obj, "Symbol.toStringTag", { value: "module" });
Object.prototype.toString.call(obj); // [object module]
```

### defineProperty

- <a href="https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty" target="_blank"> defineProperty </a>方法会直接在对象上定义一个新属性或者修改对象现有属性，并返回这个对象
- obj 定义的对象
- prop 定义或修改的属性
- descriptor 定义或修改的属性的描述

```js
let obj = {};
var ageValue = 10;

Object.defineProperty(obj, "age", {
  //writable: true, //是否可修改
  //value: 10, //writeable 和 set不能混用
  get() {
    return ageValue;
  },
  set(newValue) {
    ageValue = newValue;
  },
  enumerable: true, //是否可枚举 for-in循环能否遍历
  configurable: true, //是否可配置可删除
});

console.log(obj.age);
obj.age = 20;
console.log(obj.age);
```

## 同步模块加载

**title.js**

```js
module.exports = "title";
```

**index.js**

```js
let title = require("./title.js");
console.log(title);
```

**打包文件**

```js
const modules = {
  // modules是在ast语法分析阶段通过import、require语句生成的，内容就是元代码
  "./src/title.js": (module) => {
    module.exports = "title";
  },
};
const cache = {};
const require = (moduleId) => {
  if (cache[moduleId]) return cache[moduleId];
  const module = (cache[moduleId] = {
    export: {},
  });
  modules[moduleId](module, module.exports, require);
  return module.exports;
};

let title = require("./src/title.js");
console.log(title);
```

## 兼容性实现

- 打包后必然是`commonjs`,所以如果原来就是 commonjs 是不需要转换的，如果是`ES Module`的话就需要调用`require.r`进行标识

### CommonJS 加载 CommonJS

**index.js**

```js
let title = require("./title.js");
console.log(title); // title
```

**title.js**

```js
exports.name = "title_name";
exports.age = "title_age";
```

**打包文件**

```js
const modules = {
  "./src/title.js": (module, exports) => {
    exports.name = "title_name";
    exports.age = "title_age";
  },
};

const cache = {};
const require = (moduleId) => {
  if (cache[moduleId]) return cache[moduleId];
  const module = (cache[moduleId] = {
    exports: {},
  });
  modules[moduleId](module, module.exports, require);
  return module.exports;
};

let title = require("./src/title.js");
console.log(title);
```

### CommonJS 加载 ESModule 模块

**index.js**

```js
let title = require("./title.js");
console.log(title);
console.log(title.age);
```

**title.js**

```js
export const age = "title_age";
export default "title_name";
```

**打包文件**

```js{4-10,26-36}
// CommonJS 加载 es module
const modules = {
  "./src/title.js": (module, exports, require) => {
    // 标识此exports是一个es module导出
    require.r(exports);
    // exports上定义数据
    require.d(exports, {
      default: () => __DEFAULT_EXPORT__,
      age: () => age,
    });
    const __DEFAULT_EXPORT__ = "title_name";
    const age = "title_age";
  },
};

const cache = {};
const require = (moduleId) => {
  if (cache[moduleId]) return cache[moduleId];
  const module = (cache[moduleId] = {
    exports: {},
  });
  modules[moduleId](module, module.exports, require);
  return module.exports;
};

require.r = (exports) => {
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  Object.defineProperty(exports, "_esModule", { value: true });
};
require.d = (exports, definition) => {
  for (let key in definition) {
    Object.defineProperty(exports, key, {
      get: definition[key],
    });
  }
};
let title = require("./src/title.js");
console.log(title.default);
console.log(title.age);
```

### ESModule 加载 ESModule 模块

**index.js**

```js
import name, { age } from "./title.js";
console.log(name);
console.log(age);
```

**title.js**

```js
export const age = "title_age";
export default "title_name";
```

**打包文件**

```js{37-39}
// es module 加载 es module
const modules = {
  "./src/title.js": (module, exports, require) => {
    // 标识此exports是一个es module导出
    require.r(exports);
    // exports上定义数据
    require.d(exports, {
      default: () => __DEFAULT_EXPORT__,
      age: () => age,
    });
    const __DEFAULT_EXPORT__ = "title_name";
    const age = "title_age";
  },
};

const cache = {};
const require = (moduleId) => {
  if (cache[moduleId]) return cache[moduleId];
  const module = (cache[moduleId] = {
    exports: {},
  });
  modules[moduleId](module, module.exports, require);
  return module.exports;
};

require.r = (exports) => {
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  Object.defineProperty(exports, "_esModule", { value: true });
};
require.d = (exports, definition) => {
  for (let key in definition) {
    Object.defineProperty(exports, key, {
      get: definition[key],
    });
  }
};
// 标识导出是ES Module
const exports = {};
require.r(exports);
let title = require("./src/title.js");
console.log(title.default);
console.log(title.age);
```

### ESModule 加载 CommonJS 模块

**index.js**

```js
import name, { age } from "./title.js";
console.log(name);
console.log(age);
```

**title.js**

```js
export const age = "title_age";
export default "title_name";
```

**打包文件**

```js{31-36,41}
const modules = {
  "./src/title.js": (module, exports, require) => {
    module.exports = {
      name: "title_name",
      age: "title_age",
    };
  },
};

const cache = {};
const require = (moduleId) => {
  if (cache[moduleId]) return cache[moduleId];
  const module = (cache[moduleId] = {
    exports: {},
  });
  modules[moduleId](module, module.exports, require);
  return module.exports;
};

require.r = (exports) => {
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  Object.defineProperty(exports, "_esModule", { value: true });
};
require.d = (exports, definition) => {
  for (let key in definition) {
    Object.defineProperty(exports, key, {
      get: definition[key],
    });
  }
};
require.n = (module) => {
  // 如果是ES Module的话返回module.default,否则返回模块本身
  const getter =
    module && module._esModule ? () => module.default : () => module;
  return getter;
};

const exports = {};
require.r(exports);
let title = require("./src/title.js");
let title_default = require.n(title);
console.log(title_default());
console.log(title.age);
```

## CommonJS 和 ES Module 的区别

- CommonJS 导出的是值

**index.js**

```js
let title = require("./title");
console.log(title.age, "1"); // 10
setTimeout(() => {
  console.log(title.age, "2"); // 10
}, 3000);
```

**title.js**

```js
let age = 10;
exports.age = age;
setTimeout(() => {
  age = 20;
}, 1000);
```

**打包文件**

```js
var modules = {
  "./src/title.js": (module, exports, require) => {
    let age = 10;
    exports.age = age; // 这里是值
    setTimeout(() => {
      age = 20;
    }, 1000);
  },
};
```

- ES Module 导出的引用

**index.js**

```js
import { age } from "./title";
console.log(age, "1"); // 10
setTimeout(() => {
  console.log(age, "2"); // 20
}, 3000);
```

**title.js**

```js
export let age = 10;
export default { name: "title" };
setTimeout(() => {
  age = 20;
}, 1000);
```

**打包文件**

```js
var modules = {
  "./src/title.js": (module, exports, require) => {
    require.r(exports);
    require.d(exports, {
      // 此处是导出，导出的一个对象的引用
      default: () => __DEFAULT_EXPORT__,
      age: () => age,
    });
    const __DEFAULT_EXPORT__ = "title";
    let age = 10;
    setTimeout(() => {
      age = 20;
    }, 10);
  },
};
```

## 异步懒加载模块

**index.js**

```js
import("./hello.js").then((result) => {
  console.log(result.default);
});
```

**hello.js**

```js
module.exports = "hello";
```

**dist/src_hello_js.main.js**

```js
window["chunkLoadingGlobal"].push([
  ["src_hello_js"],
  {
    "./src/hello.js": (module) => {
      module.exports = "hello";
    },
  },
]);
```

**dist/main.js**

```js
// 初始化模块对象
const modules = {};
// 缓存对象
const cache = {};

const require = (moduleId) => {
  if (cache[moduleId]) return cache[moduleId];
  const module = (cache[moduleId] = {
    exports: {},
  });
  modules[moduleId](module, module.exports, require);
  return module.exports;
};

require.r = (exports) => {
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  Object.defineProperty(exports, "_esModule", { value: true });
};
require.d = (exports, definition) => {
  for (let key in definition) {
    Object.defineProperty(exports, key, {
      get: definition[key],
    });
  }
};
//存放加载的代码块的状态
//key是代码块的名字
//0表示已经加载完成了
const installedChunks = {
  main: 0,
  //'hello': [resolve, reject,promise]
};
//给require方法定义一个m属性，指向模块定义对象
require.m = modules;
//返回此文件对应的访问路径
require.p = "";
//返回此代码块对应的文件名
require.u = (url) => `${url}.main.js`;
require.f = {};
/**
 * 通过JSONP异步加载一个chunkId对应的代码块文件，其实就是hello.main.js
 * 会返回一个Promise
 * @param {*} chunkId 代码块ID
 * @param {*} promises promise数组
 */
require.f.j = (chunkId, promises) => {
  //当前的代码块的数据
  let installedChunkData;
  //创建一个promise
  const promise = new Promise((resolve, reject) => {
    installedChunkData = installedChunks[chunkId] = [resolve, reject];
    // installedChunks = { main: 0, hello: [resolve, reject] }
  });
  // installedChunkData = installedChunks.hello: [resolve, reject, promise]
  promises.push(promise);
  const url = require.p + require.u(chunkId);
  require.l(url);
};
require.l = (url) => {
  let script = document.createElement("script");
  script.src = url;
  document.head.appendChild(script);
};
require.e = (chunkId) => {
  let promises = [];
  require.f.j(chunkId, promises);
  return Promise.all(promises);
};
/**
 *
 * @param {*} chunkIds 代码块ID数组
 * @param {*} moreModules 额外的模块定义
 */
const webpackJsonpCallback = ([chunkIds, moreModules]) => {
  const resolves = [];
  for (let i = 0; i < chunkIds.length; i++) {
    const chunkId = chunkIds[i];
    resolves.push(installedChunks[chunkId][0]);
    installedChunks[chunkId] = 0; //表示此代码块已经下载完毕
  }
  // 合并模块定义到modules去
  for (const moduleId in moreModules) {
    modules[moduleId] = moreModules[moduleId];
  }
  // 依次取出resolve方法并执行
  while (resolves.length) {
    resolves.shift()();
  }
};
const chunkLoadingGlobal = (window.chunkLoadingGlobal = []);
chunkLoadingGlobal.push = webpackJsonpCallback;

/**
 * require.e异步加载hello代码块文件 hello.main.js
 * promise成功后会把 hello.main.js里面的代码定义合并到require.m对象上，也就是modules上
 * 调用require方法加载./src/hello.js模块，获取 模块的导出对象，进行打印
 */
require
  .e("src_hello_js")
  .then(require.bind(require, "./src/hello.js"))
  .then((result) => {
    console.log(result);
  });
```
