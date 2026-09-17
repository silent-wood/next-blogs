---
title: Webpack Loader
date: 2022-06-29
category: 工程化
tags: [Webpack, Loader]
summary: "pitch 与 loader 本身方法的执行顺序图"
---

- 所谓的 loader 只是一个导出为函数的 JavaScript 模块。接收上一个 loader 产生的结果或者资源文件(resource file) 作为入参。也可以用多个 loader 函数组成 loader chain
- compiler 需要得到最后一个 loader 产生的处理结果。这个处理结果应该是 String 或者 Buffer (被转换成为一个 string)，代表了模块的 JavaScript 源码。
- loader 分为正常(normal),前置(pre),后置(post),内联(inline)四种

```js
const request = `inline1-loader!inline2-loader!${entryFile}`; // 内联
let rules = [
  {
    test: /\.js$/,
    enforce: "", // pre:前置，post:后置，否则是normal
    use: ["normal1-loader", "normal2-loader"],
  },
];
```

## loader 运行的总体流程

![loader](/images/notes/webpack/loader.png)

## loader-runner

- <a href="https://github.com/webpack/loader-runner#readme" target="_blank">loader-runner</a> 是一个执行 loader 链条的模块

### 执行流程

**runner.js**

```js
const { runLoaders } = require("loader-runner");
const path = require("path");
const fs = require("fs"); //webpack-dev-server启开发服务器的时候 memory-fs
const entryFile = path.resolve(__dirname, "src/index.js");
//如何配置行内
let request = `inline-loader1!inline-loader2!${entryFile}`;
let rules = [
  {
    test: /\.js$/,
    use: ["normal-loader1", "normal-loader2"],
  },
  {
    test: /\.js$/,
    enforce: "post",
    use: ["post-loader1", "post-loader2"],
  },
  {
    test: /\.js$/,
    enforce: "pre",
    use: ["pre-loader1", "pre-loader2"],
  },
];
let parts = request.replace(/^-?!+/, "").split("!");
let resource = parts.pop(); //弹出最后一个元素 entryFile=src/index.js
let inlineLoaders = parts; //[inline-loader1,inline-loader2]
let preLoaders = [],
  postLoaders = [],
  normalLoaders = [];
for (let i = 0; i < rules.length; i++) {
  let rule = rules[i];
  if (rule.test.test(resource)) {
    if (rule.enforce === "pre") {
      preLoaders.push(...rule.use);
    } else if (rule.enforce === "post") {
      postLoaders.push(...rule.use);
    } else {
      normalLoaders.push(...rule.use);
    }
  }
}
let loaders = [
  ...postLoaders,
  ...inlineLoaders,
  ...normalLoaders,
  ...preLoaders,
];
let resolveLoader = (loader) =>
  path.resolve(__dirname, "loaders-chain", loader);
//把loader数组从名称变成绝对路径
loaders = loaders.map(resolveLoader);
runLoaders(
  {
    resource, //你要加载的资源
    loaders,
    context: { name: "test", age: 100 }, //保存一些状态和值
    readResource: fs.readFile.bind(this),
  },
  (err, result) => {
    console.log(err); //运行错误
    console.log(result); //运行的结果
    console.log(
      result.resourceBuffer ? result.resourceBuffer.toString("utf8") : null
    ); //读到的原始的文件
  }
);
```

**normal1-loader.js**

```js
// 其他几个loader类似
function loader(source) {
  console.log("normal1");
  return source + "//normal1";
}
loader.pitch = function () {
  console.log("normal1-pitch");
  // return "normal1-pitch";
};
module.exports = loader;
```

**执行结果**

```js
// post1-pitch
// post2-pitch
// inline1-pitch
// inline2-pitch
// normal1-pitch
// normal2-pitch
// pre1-pitch
// pre2-pitch
// pre2
// pre1
// normal2
// normal1
// inline2
// inline1
// post2
// post1
```

### 特殊配置

- <a href="https://webpack.js.org/concepts/loaders/#configuration" target="_blank">loader#configuration</a>

| 符号 | 变量                 | 含义                                    |                                                                                          |
| ---- | -------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `-!` | noPreAutoLoaders     | 不要前置和普通 loader                   | Prefixing with -! will disable all configured preLoaders and loaders but not postLoaders |
| `!`  | noAutoLoaders        | 不要普通 loader                         | Prefixing with ! will disable all configured normal loaders                              |
| `!!` | noPrePostAutoLoaders | 不要前后置和普通 loader,只要内联 loader | Prefixing with !! will disable all configured loaders (preLoaders, loaders, postLoaders) |

```js{39-50}
const { runLoaders } = require("./loader-runner");
const path = require("path");
const fs = require("fs");//webpack-dev-server启开发服务器的时候 memory-fs
const entryFile = path.resolve(__dirname, "src/index.js");
//如何配置行内
let request = `inline-loader1!inline-loader2!${entryFile}`;
let rules = [
  {
    test: /\.js$/,
    use: ["normal-loader1", "normal-loader2"],
  },
  {
    test: /\.js$/,
    enforce: "post",
    use: ["post-loader1", "post-loader2"],
  },
  {
    test: /\.js$/,
    enforce: "pre",
    use: ["pre-loader1", "pre-loader2"],
  },
];
let parts = request.replace(/^-?!+/,'').split('!');
let resource = parts.pop();//弹出最后一个元素 entryFile=src/index.js
let inlineLoaders = parts;//[inline-loader1,inline-loader2]
let preLoaders = [],postLoaders=[],normalLoaders=[];
for(let i=0;i<rules.length;i++){
    let rule = rules[i];
    if(rule.test.test(resource)){
        if(rule.enforce==='pre'){
            preLoaders.push(...rule.use);
        }else if(rule.enforce==='post'){
            postLoaders.push(...rule.use);
        }else{
            normalLoaders.push(...rule.use);
        }
    }
}
+let loaders = [];
+if(request.startsWith('!!')){
+    loaders = [...inlineLoaders];
+    //noPreAutoLoaders
+}else if(request.startsWith('-!')){
+    loaders = [...postLoaders,...inlineLoaders];
+}else if(request.startsWith('!')){
+    //noAutoLoaders
+    loaders = [...postLoaders,...inlineLoaders,...preLoaders];
+}else{
+    loaders = [...postLoaders,...inlineLoaders,...normalLoaders,...preLoaders];
+}
let resolveLoader = loader=>path.resolve(__dirname,'loaders-chain',loader)
//把loader数组从名称变成绝对路径
loaders= loaders.map(resolveLoader);
runLoaders({
    resource,//你要加载的资源
    loaders,
    context:{name:'zhufeng',age:100},//保存一些状态和值
    readResource:fs.readFile.bind(this)
},(err,result)=>{
    console.log(err);//运行错误
    console.log(result);//运行的结果
    console.log(result.resourceBuffer?result.resourceBuffer.toString('utf8'):null);//读到的原始的文件
});
```

### pitch

- 比如 a!b!c!module, 正常调用顺序应该是 c、b、a，但是真正调用顺序是 a(pitch)、b(pitch)、c(pitch)、c、b、a,如果其中任何一个 pitching loader 返回了值就相当于在它以及它右边的 loader 已经执行完毕
- 比如如果 b 返回了字符串"result b", 接下来只有 a 会被系统执行，且 a 的 loader 收到的参数是 result b
- loader 根据返回值可以分为两种，一种是返回 js 代码（一个 module 的代码，含有类似 module.export 语句）的 loader，还有不能作为最左边 loader 的其他 loader
- 有时候我们想把两个第一种 loader chain 起来，比如 style-loader!css-loader! 问题是 css-loader 的返回值是一串 js 代码，如果按正常方式写 style-loader 的参数就是一串代码字符串
- 为了解决这种问题，我们需要在 style-loader 里执行 require(css-loader!resources)

pitch 与 loader 本身方法的执行顺序图

```
|- a-loader `pitch`
  |- b-loader `pitch`
    |- c-loader `pitch`
      |- requested module is picked up as a dependency
    |- c-loader normal execution
  |- b-loader normal execution
|- a-loader normal execution
```

```js
function loader() {}
// remainingRequest: 剩下的loader,不包括自己
// previousRequest: 之前的loader
// data: 在当前loader执行中，normal和pitch之间可以使用data来传递参数
loader.pitch = function (remainingRequest, previousRequest, data) {
  // pitch可以是同步，也可以是异步
  // 同步可以使用return来返回一个值，也可以手动调用this.callback(null, value1, value2, ...)返回多个值
  // 异步需要使用this.async()返回callback,然后使用this.callback来返回
  const callback = this.async();
  callback(null, "value1", "value2");
};
```

![loader-pitch](/images/notes/webpack/loader_pitch.jpg)

## style-loader

- <a href="https://www.npmjs.com/package/less-loader" target="_blank">less-loader</a> 作用的把 less 编译成 css
- <a href="https://www.npmjs.com/package/css-loader" target="_blank">css-loader</a> 作用有两个
  - 处理 css 中的@import 和 url 这样的外部资源
  - 将 less-loader,sass-loader 等处理完成后的 css 文本，变成 JS，`module.exports = JSON.string(css)`
- <a href="https://www.npmjs.com/package/style-loader" target="_blank">style-loader</a> 的作用是将 css-loader 返回的 JS 重新处理得到 css 文本，通过 script 标签插入到 DOM 的 head 标签中
- <a href="https://webpack.js.org/api/loaders/#pitching-loader" target="_blank">pitching-loader</a> loader 的 pitch 方法，如果 pitch 方法返回了内容，不会再走后续 loader 的 pitch，normal 以及当前 loader 的 normal 方法

### 安装依赖

```bash
npm i less less-loader css-loader style-loader -D
```

### 使用 less-loader

**src/index.js**

```js
import "./index.less";
```

**src/index.less**

```less
@color: blue;
body {
  background: @color;
}
```

**webpack.config.js**

```js
{
  test: /\.less$/,
  use: [
    'style-loader',
    'css-loader',
    'less-loader'
  ]
}
```

**less-loader.js**

```js
const less = require("less");
function loader(lessSource) {
  let cssSource;
  //如果调用了this.async方法，就会把loader的执行从同步变成异步，只有当你手工调用callback的时候才会认为此loader执行结束
  const callback = this.async();
  less.render(lessSource, { filename: this.resource }, (err, output) => {
    cssSource = output.css;
    this.callback(null, cssSource, output.map, output.ast);
  });
  // 如果不使用async的话，直接返回就可以
  // return cssSource
}

module.exports = loader;
```

**css-loader.js**

```js
// css-loader有二个功能，一个是处理url @import, 一个是变成js
function loader(cssSource, map, ast) {
  return `module.exports=${JSON.stringify(cssSource)}`;
}
module.exports = loader;
```

在不使用 css-loader 的情况下，less-loader 返回的直接是 css 文本，可以直接插入到 DOM 中就可以
**style-loader.js**

```js
function loader(cssSource) {
  let script = `
    let style = document.createElement('style');
    style.innerHTML = ${JSON.stringify(cssSource)}
    document.head.appendChild(style)
  `;
  return script;
}
```

但是实际情况中，还是必须使用 css-loader，所以如下处理
![less-loader](/images/notes/webpack/less-loader.png)

```js
const path = require("path");
function loader() {}
loader.pitch = function (remainingRequest) {
  //webpack根据文件后缀，根据你配置的loader,找到的使用的所有的loader
  // 项目根目录路径\my-loaders\css-loader.js|项目根目录路径\my-loaders\less-loader.js!项目根目录路径\src\index.less
  //remainingRequest是一个字符串，loader的绝对路径加上要加载的文件的绝对路径，用!拼接在一起
  //这个内联是手工实现
  const scriptSrc = stringifyRequest(this, "!!" + remainingRequest);
  let script = `
  let style = document.createElement('style');
  style.innerHTML = require(${scriptSrc})
  document.head.appendChild(style)
  `;
  return script;
};

function stringifyRequest(loaderContext, request) {
  let prefixReg = /^-?!+/;
  let prefixRequest = request.match(prefixReg);
  let prefix = prefixRequest ? prefixRequest[0] : ""; // !!
  /* [
    c:webpack-useage/5.loaders/my-loaders/style-loader.js,
    c:webpack-useage/5.loaders/my-loaders/css-loader.js,
    c:/webpack-useage/5/loader/src/index.less
  ] */
  const splitted = request.replace(prefixReg, "").split("!");
  const { context } = loaderContext;
  // !!./my-loaders/less-loader.js!./my-loaders/css-loader!./src/index.less
  return JSON.stringify(
    prefix +
      splitted
        .map((part) => {
          part = path.relative(context, part);
          if (part[0] !== ".") {
            part = "./" + part;
          }
          return part.replace(/\\/g, "/");
        })
        .join("!")
  );
}
module.exports = loader;
```

## file-loader

```js
function loader(source) {
  let filename = Date.now() + ".jpg";
  // 用于向输出目录写入文件
  this.emitFile(filename, source);
  return `module.exports = ${JSON.stringify(filename)}`;
}

loader.raw = true; // 标记为需要使用buffer
module.exports = loader;
```

> 从 webpack5 开始`file-loader`和`url-loader`已经内置了，使用方法

```
{
  test: /.jpg$/,
  // use: ['file-loader'],
  type: 'asset'
}
```

## loader-runner.js

```js
const fs = require("fs");

/**
 * 创建loader对象
 * @param {*} loader 就是对应loader的路径
 */
function createLoaderObject(loader) {
  const normal = require(loader); // loader函数
  const pitch = normal.pitch;
  return {
    path: loader,
    normal,
    pitch,
    raw: normal.raw, // 如果raw是true，表示需要接受的是buffer
    data: {}, // 每个loader对象都有一个自定义的data对象，可以在pitch和normal进行传递
    pitchExecuted: false, // pitch函数是否执行过了
    normalExecuted: false, // normal函数是否执行过了
  };
}

function processResource(processOptions, loaderContext, pitchingCallback) {
  processOptions.readResource(loaderContext.resource, (err, resourceBuffer) => {
    processOptions.resourceBuffer = resourceBuffer;
    loaderContext.loaderIndex--; // 反向执行
    return iterateNormalLoaders(
      processOptions,
      loaderContext,
      [resourceBuffer],
      pitchingCallback
    );
  });
}
function iteratePitchingLoaders(
  processOptions,
  loaderContext,
  pitchingCallback
) {
  if (loaderContext.loaderIndex >= loaderContext.loaders.length) {
    return processResource(processOptions, loaderContext, pitchingCallback);
  }
  const currentLoader = loaderContext.loaders[loaderContext.loaderIndex];
  if (currentLoader.pitchExecuted) {
    // 如果当前loader的pitch已经执行过了，向下执行
    loaderContext.loaderIndex++;
    return iteratePitchingLoaders(
      processOptions,
      loaderContext,
      pitchingCallback
    );
  }
  let pitchFn = currentLoader.pitch;
  currentLoader.pitchExecuted = true; // 不管有没有都把pitchExecuted设为true
  if (!pitchFn) {
    return iteratePitchingLoaders(
      processOptions,
      loaderContext,
      pitchingCallback
    );
  }
  // 如果pitch有值，以同步或异步的方式执行pitch函数，loaderContext为this指针
  runSyncOrAsync(
    pitchFn,
    loaderContext,
    [
      loaderContext.remainingRequest,
      loaderContext.previousRequest,
      loaderContext.data,
    ],
    (err, ...args) => {
      // 如果这个loader的pitch方法有返回值了，掉头执行上一个loader的normal
      if (args && args.length && args.some((item) => item)) {
        loaderContext.loaderIndex--;
      } else {
        return iteratePitchingLoaders(
          processOptions,
          loaderContext,
          pitchingCallback
        );
      }
    }
  );
}
function coverArgs(args, raw) {
  // 转换参数
  if (raw && !Buffer.isBuffer(args[0])) {
    args[0] = Buffer.from(args[0]);
  } else if (!raw && Buffer.isBuffer(args[0])) {
    args[0] = args[0].toString("utf8");
  }
}
// normal方法需要接受上一个normal或者pitch返回的内容
function iterateNormalLoaders(
  processOptions,
  loaderContext,
  args,
  pitchingCallback
) {
  if (loaderContext.loaderIndex < 0) {
    return pitchingCallback(null, args);
  }
  const currentLoader = loaderContext.loaders[loaderContext.loaderIndex];
  if (currentLoader.normalExecuted) {
    loaderContext.loaderIndex--;
    return iterateNormalLoaders(
      processOptions,
      loaderContext,
      args,
      pitchingCallback
    );
  }
  const normalFn = currentLoader.normal;
  currentLoader.normalExecuted = true;
  coverArgs(args, currentLoader.raw);
  runSyncOrAsync(normalFn, loaderContext, args, (err, ...returnArgs) => {
    if (err) return pitchingCallback(err);
    return iterateNormalLoaders(
      processOptions,
      loaderContext,
      returnArgs,
      pitchingCallback
    );
  });
}

function runSyncOrAsync(fn, loaderContext, args, runCallback) {
  let isSync = true; // 默认loader.pitch是同步的
  let isDone = false; // 表示此函数是否已经完成
  loaderContext.callback = (err, ...args) => {
    // 这里是为了防止在异步逻辑中直接调用this.callback
    // 异步逻辑需要先调用 let callBack = this.async(); 这是为了先标记为异步，后调用callback返回
    if (isDone) {
      throw new Error("async(): The callback was already called.");
    }
    isDone = true;
    return runCallback(err, ...args);
  };
  loaderContext.async = () => {
    isSync = false; // 这个方法把同步变成异步
    return loaderContext.callback;
  };
  let result = fn.apply(loaderContext, args);
  if (isSync) {
    // 如果是同步的，直接调用runCallback,继续执行下一个方法
    isDone = true; // 标记为已经执行过
    runCallback(null, result);
  }
}

function runLoaders(options, finalCallback) {
  // context: 默认的上下文
  const {
    resource,
    loaders,
    context = {},
    readResource = fs.readFile,
  } = options;
  const loaderObjects = loaders.map(createLoaderObject);
  const loaderContext = context; // 会成为loader执行过程中的this指针
  loaderContext.resource = resource;
  loaderContext.loaders = loaderObjects;
  loaderContext.readResource = readResource;
  loaderContext.loaderIndex = 0; // 当前执行loader的索引
  loaderContext.callback = null; // 调用callback可以让当前的loader执行结束，并且向后续的loader传递多个值
  loaderContext.async = null; // 是内置方法，可以把loader的执行从同步变成异步
  Object.defineProperty(loaderContext, "request", {
    get() {
      // loader1.js!loader2.js!loader3.js!file.js
      return loaderContext.loaders
        .map((loader) => loader.path)
        .concat(loader.resource)
        .join("!");
    },
  });
  Object.defineProperty(loaderContext, "remainingRequest", {
    get() {
      // 后续的loader， 不包括自己 当前loaderIndex = 1, loader3.js!file.js
      return loaderContext.loaders
        .slice(loaderContext.loaderIndex + 1)
        .map((loader) => loader.path)
        .concat(options.resource)
        .join("!");
    },
  });
  Object.defineProperty(loaderContext, "currentRequest", {
    get() {
      // 当前的loader,包括自己 当前loaderIndex = 1, loader2.js!loader3.js!file.js
      return loaderContext.loaders
        .slice(loaderContext.loaderIndex)
        .map((loader) => loader.path)
        .concat(options.resource)
        .join("!");
    },
  });
  Object.defineProperty(loaderContext, "previousRequest", {
    get() {
      // 上一次, 当前loaderIndex = 1, loader2.js!loader3.js!file.js
      return loaderContext.loaders
        .slice(0, loaderContext.loaderIndex)
        .map((loader) => loader.path)
        .concat(options.resource)
        .join("!");
    },
  });
  Object.defineProperty(loaderContext, "data", {
    get() {
      // 上一次, 当前loaderIndex = 1, loader2.js!loader3.js!file.js
      return loaderContext.loaders[loaderContext.loaderIndex].data;
    },
  });

  let processOptions = {
    resourceBuffer: null, // 存放着要加载的模块的原始内容
    readResource, // 读取文件的方法
  };
  // 迭代执行loader的pitch函数
  iteratePitchingLoaders(processOptions, loaderContext, (err, result) => {
    finalCallback(err, {
      result,
      resourceBuffer: processOptions.resourceBuffer,
    });
  });
}

exports.runLoaders = runLoaders;
```
