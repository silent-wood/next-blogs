---
title: Webpack SplitChunks 分包策略
date: 2022-07-06
category: 工程化
tags: [Webpack, SplitChunks]
summary: "module2/module3 同理"
---

## 代码分割

- 对于大的 Web 应用来讲，将所有的代码都放在一个文件中显然是不够有效的，特别是当你的某些代码块是在某些特殊的时候才会被用到
- webpack 有一个功能就是将你的代码库分割成 chunks 语块，当代码运行到需要它们的时候再进行加载

## 入口点分割

- Entry Points：入口文件设置的时候可以配置
- 这种方法的问题
  - 如果入口 chunks 之间包含重复的模块(lodash)，那些重复模块都会被引入到各个 bundle 中
  - 不够灵活，并且不能将核心应用程序逻辑进行动态拆分代码

```
{
  entry: {
   page1: "./src/page1.js",
   page2: "./src/page2.js"
  }
}
```

## 动态导入和懒加载

- 用户当前需要用什么功能就只加载这个功能对应的代码，也就是所谓的按需加载 在给单页应用做按需加载优化时
- 一般采用以下原则：
  - 对网站功能进行划分，每一类一个 chunk
  - 对于首次打开页面需要的功能直接加载，尽快展示给用户,某些依赖大量代码的功能点可以按需加载
  - 被分割出去的代码需要一个按需加载的时机

**hello.js**

```js
console.log("hello");
module.exports = "hello";
```

**index.js**

```js
const btn = document.getElementById("button");
btn.addEventListener("click", () => {
  import("./hello").then((res) => {
    console.log(res.default, "index");
  });
});
```

> 在没有点击按钮的时候，浏览器并未加载`hello.js`,按钮点击后，才会动态加载 hello.js，执行 hello.js -> index.js。这种情况下 hello.js 的优先级为`低`

![splitChunks](/images/notes/webpack/splitChunks.png)

### preload

- preload(预加载)通常用于本页面需要用到的关键资源，包括 JS、CSS、字体等文件
- preload 将会把资源的下载顺序权重提高，使得关键数据提前下载好，优化页面打开速度
- 在资源上添加预先加载的注释，指明该模块需要立即被使用
- 资源加载的优先级分为 5 个级别
  - Highest 最高
  - High 高
  - Medium 中等
  - Low 低
  - Lowest 最低
- 异步/延迟/插入的脚本在网络优先级中是`Low`
- <a href="https://www.npmjs.com/package/@vue/preload-webpack-plugin" target="_blank">@vue/preload-webpack-plugin</a>
- - 结果是在`head`中插入了一个`link`标签 `<link rel="preload" href="utils.js" as="script"></link>`

**webpack.config.js**

```js
const PreloadWebpackPlugin = require("@vue/preload-webpack-plugin");
module.exports = {
  plugins: [new PreloadWebpackPlugin({})],
};
```

**index.js**

```js
const btn = document.getElementById("button");
btn.addEventListener("click", () => {
  import(
    "./hello"
    /* webpackPreload: true */
    /* webpackChunkName: 'hello' */
  ).then((res) => {
    console.log(res.default, "index");
  });
});
```

### prefetch

- prefetch(预先拉取) 和 preload 不同，它的作用是告诉浏览器未来可能会使用到某个资源，浏览器就会在空闲的时候去加载对应的资源，若能预测到用户的行为，比如懒加载、点击到其他页面等则相当于提前预加载了需要的资源
- 结果是在`head`中插入了一个`link`标签 `<link rel="prefetch" href="utils.js" as="script"></link>`
  **index.js**

```js
btn.addEventListener("click", () => {
  import(
    "./hello"
    /* webpackPrefetch: true */
    /* webpackChunkName: 'hello' */
  ).then((res) => {
    console.log(res.default, "index");
  });
});
```

### preload VS prefetch

- preload 是告诉浏览器页面必定需要的资源，浏览器一定会加载这些资源
- prefetch 是告诉浏览器页面可能需要的资源，浏览器不一定会加载这些资源
- 所以建议：对于当前页面很有必要的资源使用 preload,对于可能在将来的页面中使用的资源使用 prefetch

### preload-webpack-plugin

**preload-webpack-plugin.js**

```js
const HtmlWebpackPlugin = require("html-webpack-plugin");
/**
 * 1、查找当前产出代码块中的异步代码块
 * 2、针对每个异步代码块生成一个link标签
 * 3、把生成的link标签插入到输出的html中
 *   */
class PreloadWebpackPlugin {
  constructor(options) {
    this.options = options || {};
  }
  apply(compiler) {
    compiler.hooks.compilation.tap("PreloadWebpackPlugin", (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).beforeAssetTagGeneration.tapAsync(
        "HtmlWebpackPlugin",
        (htmlData, callback) => {
          this.generateLinks(compilation, htmlData, callback);
        }
      );
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tap(
        "HtmlWebpackPlugin",
        (htmlData) => {
          const { resourceHints } = this;
          if (resourceHints) {
            htmlData.assetTags.styles = [
              ...resourceHints,
              ...htmlData.assetTags.styles,
            ];
          }
          return htmlData;
        }
      );
    });
  }
  generateLinks(compilation, htmlData, callback) {
    const { rel, as, include } = this.options;
    //本次编译产出的代码块
    let chunks = [...compilation.chunks];
    //如果说包括的是异步的代码块
    if (include === undefined || include === "asyncChunks") {
      //如果chunk.canBeInitial()为true,说明这是一个入口代码块 main.canBeInitial()
      //过滤一下，只留下异步代码块
      chunks = chunks.filter((chunk) => !chunk.canBeInitial());
    }
    let allFiles = chunks.reduce((accumulated, chunk) => {
      return accumulated.add(...chunk.files);
    }, new Set());
    const links = [];
    for (const file of allFiles.values()) {
      links.push({
        tagName: "link",
        attributes: {
          rel: rel || "preload", //preload prefetch
          href: file,
          as: as || "script",
        },
      });
    }
    this.resourceHints = links;
    callback();
  }
}

module.exports = PreloadWebpackPlugin;
```

## 提取公共代码

- <a href="https://webpack.js.org/plugins/split-chunks-plugin/" target="_blank">split-chunks-plugin</a>

### 提取公共代码

- 大网站有多个页面，每个页面由于采用相同技术栈和样式代码，会包含很多公共代码，如果都包含进来会有问题
- 相同的资源被重复的加载，浪费用户的流量和服务器的成本；
- 每个页面需要加载的资源太大，导致网页首屏加载缓慢，影响用户体验。
- 如果能把公共代码抽离成单独文件进行加载能进行优化，可以减少网络传输流量，降低服务器成本

### 如何提取

- 基础类库，方便长期缓存
- 页面之间的公用代码
- 各个页面单独生成文件

### module chunk bundle

- module：就是 js 的模块化 webpack 支持 commonJS、ES6 等模块化规范，简单来说就是你通过 import 语句引入的代码
- chunk: chunk 是 webpack 根据功能拆分出来的，包含三种情况
  - 项目入口`entry`
  - 通过`import()`动态引入的代码
  - 通过`splitChunks`拆分出来的代码
- bundle：bundle 是 webpack 打包之后的各个文件，一般就是和 chunk 是一对一的关系，bundle 就是对 chunk 进行编译压缩打包等处理之后的产出

### splitChunks

![splitChunksExample](/images/notes/webpack/splitChunksExample.png)

**page1.js**

```js
const m1 = require("./module1");
const m2 = require("./module2");
const $ = require("jquery");
import("./asyncModule1");
```

**page2.js**

```js
const m1 = require("./module1");
const m2 = require("./module2");
const $ = require("jquery");
```

**page3.js**

```js
const m1 = require("./module1");
const m3 = require("./module3");
const $ = require("jquery");
```

**asyncModule.js**

```js
const _ = require("lodash");
```

**module1.js**  
module2/module3 同理

```js
module.exports = "module1";
```

#### 默认情况

- `vendors_lodash` 这里就算是不配置默认也是有的缓存组
- `page1.js` 入口页面分割
- `page2.js`
- `page3.js`
- `src_asyncModule1` 由于是通过`import()`分割

而没有`jquery`是由于是通过同步引入，默认不会另外分包

####　配置 splitChunk
**webpack.config.js**

```js
module.exports = {
  optimization: {
    splitChunks: {
      // 表示拆分出的chunk的名称连接符。默认为~。如chunk~vendors.js
      automaticNameDelimiter: "~",
      // 表示选择哪些 chunks 进行分割，可选值有：async(异步)，initial(同步)和all(async + initial)
      chunks: "all",
      // 表示新分离出的chunk必须大于等于minSize，默认为30000，约30kb。
      minSize: 0,
      // 表示一个模块至少应被minChunks个chunk所包含才能分割。默认为1。
      minChunks: 1,
      // 表示按需加载文件时，并行请求的最大数目。默认为5。
      maxAsyncRequests: 3,
      // 表示加载入口文件时，并行请求的最大数目。默认为3
      maxInitialRequests: 5,
      cacheGroups: {
        defaultVendors: {
          // 缓存组
          test: /node_modules/, // 条件，表示如果绝对路径包含node_modules就会打包到这个缓存组中
          priority: -10, // 优先级， 一个chunk可能满足多个缓存组，会被抽取到优先级高的缓存组中，默认值都是负值
        },
        default: {
          minChunks: 2, // 至少被几个模块共享
          priority: -20,
        },
      },
    },
  },
};
```

- `vendors-lodash`
- `page1`
- `page2`
- `page3`
- `src_asyncModule1`
- `default-src-module1` module1 同时被 page1/page2/page3 引用
- `default-src-module2` module2 同时被 page1/page2 引用
- `defaultVendors-jquery` 符合了 defaultVendor 缓存组
