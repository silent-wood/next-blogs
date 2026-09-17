---
title: Webpack 插件机制
date: 2022-07-06
category: 工程化
tags: [Webpack, Plugin]
summary: "Webpack 是基于插件的工作流程。Plugin(https://webpack.js.org/concepts/plugins/)"
---

Webpack 是基于插件的工作流程。[Plugin](https://webpack.js.org/concepts/plugins/)  
自己实现一个插件，参考 [插件](https://webpack.js.org/contribute/writing-a-plugin/#creating-a-plugin)

## plugin

- 插件向用户提供了`webpack`引擎中完整的能力。使用阶段式的构建回调，开发者可以引入他们自己的行为到 webpack 构建流程中。创建插件比创建 loader 更加高级，因为需要理解一些 webpack 底层的内部特性来做相应的钩子。

### 为什么需要插件

- webpack 基础配置无法满足需求
- 插件几乎能够任意更改 webpack 编译结果
- webpack 内部也是通过大量的内部插件实现的

### 可以加载插件的常用对象

[API 文档](https://webpack.js.org/api/compiler-hooks/)

[代码参考](https://github.com/webpack/webpack/tree/main/lib)

- Compiler
- Compilation
- ContextModuleFactory
- JavascriptParser
- NormalModuleFactory

## 创建插件

- 插件是一个具有 apply 方法的类，apply 的参数是 compiler 对象

```js
class DonePlugin {
  constructor(options) {
    this.options = options || {};
  }
  apply(compiler) {}
}
module.exports = DonePlugin;
```

## Compiler 和 Compilation

在插件开发中最重要的两个资源就是`compiler`和`compilation`对象

- compiler 对象代表了完整的 webpack 环境配置。这个对象在启动 webpack 时建立，整个流程中只有一个。包括 options,loader 和 plugin。当在 webpack 环境中应用一个插件是，插件将收到这个 compiler 对象的引用，可以用他来访问 webpack 主环境
- compilation 对象代表了一次资源版本构建。当运行 webpack 开发环境中间件时，每当检测到一个文件变化，就会创建一个新的 compilation，从而生成一组新的编译资源。一个 compilation 对象表现了当前的模块资源、编译资源、变化的文件以及被跟踪依赖的状态信息。compilation 对象也提供了很多关键时机的回调，以供插件做自定义处理时选择使用

## 基本插件架构

插件的使用

```js
// 3.加载所有的插件
const { plugins = [] } = finalOptions;
if (Array.isArray(plugins)) {
  for (let plugin of plugins) {
    plugin.apply(compiler);
  }
}
```

### Compiler 插件

- 同步

```js
class DonePlugin {
  constructor(options) {
    this.options = options;
  }
  apply(compiler) {
    compiler.hooks.done.tap("DonePlugin", (stats) => {
      console.log("Hello ", this.options.name);
    });
  }
}
module.exports = DonePlugin;
```

- 异步

```js
class DonePlugin {
  constructor(options) {
    this.options = options;
  }
  apply(compiler) {
    compiler.hooks.done.tapAsync("DonePlugin", (stats, callback) => {
      console.log("Hello ", this.options.name);
      callback();
    });
  }
}
module.exports = DonePlugin;
```

## Compilation 插件

- 使用 compiler 对象时，可以绑定提供了编译对象 compilation 引用的回调函数，然后拿到每次新的 compilation 对象。这些 compilation 对象提供了一些钩子函数

```js
//编写个Compilation插件，用来打印本次产出的代码块和文件
class WebpackAssetsPlugin {
  constructor(options) {
    this.options = options;
  }
  apply(compiler) {
    //每当webpack开启一次新的编译 ，就会创建一个新的compilation
    compiler.hooks.compilation.tap("WebpackAssetsPlugin", (compilation) => {
      //每次根据chunk创建一个新的文件后会触发一次chunkAsset
      compilation.hooks.chunkAsset.tap(
        "WebpackAssetsPlugin",
        (chunk, filename) => {
          console.log(chunk.name || chunk.id, filename);
        }
      );
    });
  }
}
module.exports = WebpackAssetsPlugin;
```

## 打包插件

- [webpack-sources](https://www.npmjs.com/package/webpack-sources)
- [jszip](https://www.npmjs.com/package/jszip)

**webpack-archive-plugin.js**

```js
const jszip = require("jszip");
const { RawSource } = require("webpack-sources");
const { Compilation } = require("webpack");
/**
 * 1.如何获取打出后的文件名和文件内容
 * 2.如何打压缩包
 * 3.如何向目标目录输出压缩包
 */
class WebpackArchivePlugin {
  constructor(options) {
    this.options = options;
  }
  apply(compiler) {
    compiler.hooks.compilation.tap("WebpackAssetsPlugin", (compilation) => {
      //当确定好文件，当你处理每个资源的时候处执行
      compilation.hooks.processAssets.tapPromise(
        { name: "WebpackArchivePlugin" },
        (assets) => {
          const zip = new jszip();
          for (const filename in assets) {
            const sourceObj = assets[filename];
            const sourceCode = sourceObj.source();
            zip.file(filename, sourceCode);
          }
          return zip
            .generateAsync({ type: "nodebuffer" })
            .then((zipContent) => {
              assets[`archive_${Date.now()}。zip`] = new RawSource(zipContent);
            });
        }
      );
    });
  }
}
module.exports = WebpackArchivePlugin;
```

**webpack.config.js**

```js
const WebpackArchivePlugin = require("./plugins/webpack-archive-plugin");
module.exports = {
  plugins: [
    new WebpackArchivePlugin({
      filename: "[timestamp].zip",
    }),
  ],
};
```

## 自动外链插件

- 正常使用外链
  - 手动指定 `external`
  - 手动引入 `script`

**webpack.config.js**

```js
module.exports = {
  externals: {
    // 告诉webpack jquery，lodash两个模块直接从window上取
    jquery: "$",
    lodash: "_",
  },
};
```

**index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>
  <body>
    <script src="https://cdn.bootcss.com/jquery/3.1.0/jquery.js"></script>
    <script src="https://cdn.bootcdn.net/ajax/libs/lodash.js/4.17.21/lodash.js"></script>
  </body>
</html>
```

- 自动外链插件同时需要插件，并且传递外链对象
  - 解决 `import` 自动处理 `external` 和 `script` 的问题
  - 依赖 当检测到有 `import` 该 `library` 时，将其设置为不打包类似 `external`,并在指定模版中加入 `script`。用 `Parser`来检测 `import`
  - `external` 依赖, `webpack` 的 `external` 是通过插件 `ExternalsPlugin` `实现的，ExternalsPlugin` 通过 `tap` `NormalModuleFactory` 在每次创建 `Module` 的时候判断是否是 `ExternalModule`
  - `webpack4` 加入了模块类型之后，`Parser` 获取需要指定类型 `moduleType`,一般使用 `javascript/auto` 即可

**webpack.config.js**

```js
module.exports = {
  plugins: [
    new AutoExternalsPlugin({
      jquery: {
        variable: "$", // CDN引入后的变量名
        url: "https://cdn.bootcss.com/jquery/3.1.0/jquery.js",
      },
      lodash: {
        variable: "_",
        url: "https://cdn.bootcdn.net/ajax/libs/lodash.js/4.17.21/lodash.js",
      },
    }),
  ],
};
```

**auto-externals-plugin.js**

```js
const { ExternalModule } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
/**
 * 插件功能
 *  1、分析代码，找到依赖的模块  需要知道项目中是否引入了外链模块
 *  2、如果引入了外链模块
 *    1. 自动向输出的HTML文件添加script，url指向配置的cdn地址
 *    2. 改造生产模块的流程，如果发现要打包的模块是一个外链模块，走外链模块的创建流程
 */
class AutoExternalPlugin {
  constructor(options) {
    this.options = options;
    this.externalModules = Object.keys(options); // ['lodash', 'jquery']
    this.importedModules = new Set(); // 项目中真正用到的模块
  }
  apply(compiler) {
    // 当创建模块的时候，会先创建一个模块工厂，触发normalModuleFactory钩子
    compiler.hooks.normalModuleFactory.tap(
      "AutoExternalPlugin",
      (normalModuleFactory) => {
        normalModuleFactory.hooks.parser // 这是一个hookMap
          .for("javascript/auto") // 获取js对应的hook， 普通 的JS文件对应的钩子就是'javascript/auto'
          .tap("AutoExternalPlugin", (parser) => {
            // 解析器会把index.js从源码转换成AST，然后遍历
            // import jquery from 'jquery'
            // import 语句 是parser.hooks.import 钩子捕获的
            parser.hooks.import.tap(
              "AutoExternalPlugin",
              (statement, source) => {
                if (this.externalModules.includes(source)) {
                  console.log(source, "import");
                  this.importedModules.add(source);
                }
              }
            );
            // require('lodash')
            // require语句是一个CallExpression，parser.hooks.call返回的是一个hookMap
            parser.hooks.call
              .for("require")
              .tap("AutoExternalPlugin", (expression) => {
                let value = expression.arguments[0].value;
                console.log(value, "require");
                if (this.externalModules.includes(value)) {
                  this.importedModules.add(value);
                }
              });
          });
        // 2、介入改造生产模块的流程，如果是外部模块，不再走正常的模块生产逻辑，而是走外部模块的生产逻辑
        normalModuleFactory.hooks.factorize.tapAsync(
          "AutoExternalPlugin",
          (resolveData, callback) => {
            const { request } = resolveData; // 先获取请求资源 jquery/lodash
            if (this.externalModules.includes(request)) {
              // 如果是一个外部模块，就直接创建一个外部模块返回
              let { variable } = this.options[request];
              callback(null, new ExternalModule(variable, "window", request)); // 创建外链模块，从window上取变量名
            } else {
              // 普通模块就直接向后执行
              callback(null);
            }
          }
        );
      }
    );
    compiler.hooks.compilation.tap("AutoExternalPlugin", (compilation) => {
      // HtmlWebpackPlugin会向compiler中插入其他的钩子，通过getHooks获取
      // alertAssetTags 用来想输出的HTML文件插入或者修改标签 meta style css
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapAsync(
        "AutoExternalPlugin",
        (htmlData, callback) => {
          Object.keys(this.options)
            .filter((key) => this.importedModules.has(key))
            .forEach((key) => {
              htmlData.assetTags.scripts.unshift({
                tagName: "script",
                voidTag: false,
                attributes: {
                  defer: false,
                  src: this.options[key].url,
                },
              });
            });
          callback(null); // 需要调用callback让流程向下走
        }
      );
    });
  }
}

module.exports = AutoExternalPlugin;
```
