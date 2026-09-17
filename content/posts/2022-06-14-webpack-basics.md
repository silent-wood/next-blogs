---
title: Webpack 基础使用
date: 2022-06-14
category: 工程化
tags: [Webpack]
summary: "webpack.config.js"
---

## 介绍

### 安装

```bash
npm install  webpack webpack-cli --save-dev
```

### 模式

- 平常的项目中一般都会有两套构建环境
- 一套开发使用，头肩结果用于本地开发调试，不进行代码压缩，打印信息，包含 sourcemap 文件
- 一套构建后的结果直接部署到服务器上，代码都是压缩后的，运行时不打印 debug 信息，静态文件不包括 sourcemap
- webpack 4.x 引入了 `mode` 概念
- 当指定了 production mode 时，默认会开启各种性能优化的功能，包括构建结果优化以及 webpack 运行性能优化
- 如果是 development mode,则会开启 debug 工具，运行时打印错误信息以及更加快速的增量编译构建

**development**: 启用 NamedChunksPlugin 和 NamedModulesPlugin。

**production**: 启用 FlagDependencyUsagePlugin、FlagIncludedChunksPlugin、ModuleConcatenationPlugin、NoEmitOnErrorsPlugin、OccurrenceOrderPlugin、SideEffectsFlagPlugin 和 UglifyJsPlugin。

#### 环境差异

- 开发环境
  - 需要生成 sourcemap 文件
  - 需要打印 debug 信息
  - 需要 live reload 或者 hot reload 功能
- 生产环境
  - 可能需要分离 CSS 成单独的文件，以便多个页面共享一个 CSS 文件
  - 需要压缩 HTML/CSS/JS 代码
  - 需要压缩图片
  - 不需要 sourcemap 文件
- 默认值是 production

#### 区分环境

- `--mode` 用来设置模块内的 `process.env NODE_ENV`
- `--env` 用来设置 webpack 配置文件的函数参数(影响的是`webpack.config.js`配置文件中`module.exports`函数中的环境)
- `DefinePlugin` 用来设置模块内的全局变量
  > 前三者影响的都是模块内的代码，而`webpack.config.js`中的是`node环境`不受影响
- `cross-env` 用来设置 `webpack.config.js`配置文件中`node环境`的 `process.env NODE_ENV`
  > 由于在 windows 和 mac 系统中设置环境变量的方式不同，window：set NODE_ENV=development,mac：export NODE_ENV=development,借助`cross-env`来统一成`cross-env key=value`的方式设置

**命令行配置 1**

```json
{
  "scripts": {
    "build": "webpack",
    "serve": "webpack serve"
  }
}
```

index.js

```js
console.log(process.env.NODE_ENV); // production|development
```

webpack.config.js

```js
console.log(process.env.NODE_ENV); // undefined
```

**命令行配置 2**

```json
{
  "scripts": {
    "build": "webpack --env=development"
  }
}
```

webpack.config.js

```js
console.log(process.env.NODE_ENV); // undefined
module.exports = (env, argv) => {
  console.log(env); // development
};
```

index.js

```js
// 这里需要根据配置文件中的mode的值，如果设置了才会有，否则默认是production
console.log(process.env.NODE_ENV);
```

**命令行配置 3**

```json
{
  "scripts": {
    "build": "webpack"
  }
}
```

webpack.config.js

```js
console.log(process.env.NODE_ENV); // production
```

index.js

```js
console.log(process.env.NODE_ENV); // undefined
```

**mode 配置**

- 和配置 1 相同

**DefinePlugin**

- 设置全局变量，所有模块都能读取改变量的值
- 可以在任意模块内通过 `process.env NODE_ENV`获取当前环境变量的值
- 无法在`node环境`(webpack 配置文件)下获取当前环境变量

```js
module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      // "process.env NODE_ENV": JSON.stringify(process.env NODE_ENV),
    }),
  ],
};
```

**cross-env**

- 只能设置`node环境`的变量 NODE_ENV

```json
{
  "scripts": {
    "build": "cross-env NODE_ENV=development webpack"
  }
}
```

webpack.config.js

```js
console.log(process.env.NODE_ENV); // development
```

### 入口

- 入口值的是 webpack 应该使用哪个模块来作为构建其尼日不依赖图的开始。进入入口后，webpack 会找出有哪些模块和库是入口起点的依赖
- 默认值是`./src/index.js`,但是可以通过在`webpack.config.js`中配置 `entry`属性来指定一个或多个不同入口起点

**webpack.config.js**

```js
module.exports = {
  entry: "./src/index.js",
  /*
  entry: { 这样在打包完成后会生成两个js文件
    main: './src/main.js',
    index: 'src/index.js'
  },
  entry: ['./src/main.js', './src/index.js'] // 这样只会生成一个入口文件
  */
};
```

### 输出

- `output`属性高数 webpack 在哪里输出打包结果，以及如何命名这些文件
- 主要输出文件的默认值是 `./dist/main.js `, 其他生成文件默认放在`dist`文件夹中
  **webpack.config.js**

```js
const path = require("path");
module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.js", // 可以写成[name].js，这样多文件的时候也会根据入口文件来定义生成文件名称
  },
};
```

> `filename`的多种写法参考 [ output.filename ](https://www.webpackjs.com/configuration/output/#output-filename)

### loader

- webpack 只能理解 `JavaScript` 和 `JSON` 文件
- loader 让 `webpack` 能够去处理其他类型的文件，并将其转换为有效模块，以供程序使用，以及被添加到依赖图中
  **webpack.config.js**

```js{10-14}
const path = require('path');
module.exports = {
  mode: 'development',
  devtool:false,
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js'
  },
+  module: {
+    rules: [
+      { test: /\.css$/, use: ['style-loader','css-loader']}
+    ]
+  }
};
```

### 插件

- loader 用于转换文件类型的模块，而插件则可以用于执行范围更广的任务。包括：打包优化、资源管理、注入环境变量等

**webpack.config.js**

```js{2,16-18}
const path = require('path');
+ const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
  mode: 'development',
  devtool:false,
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js'
  },
  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader','css-loader']}
    ]
  },
+  plugins: [
+    new HtmlWebpackPlugin({template: './src/index.html'})
+  ]
};
```

## 开发服务器

### 安装

```bash
npm install webpack-dev-server --save-dev
```

### 说明

- output
- path:指定输出到硬盘的目录
- publicPath:表示打包生成的 index.html 文件里面引用资源的前缀
- devServer
  - publicPath:表示打包生成的静态文件所在的位置，如 devServer 中的 publicPath 没有设置，则认为是 output 里面设置的 publicPath 的值
  - static:用于配置提供额外静态文件内容的目录

```js
module.exports = {
  devServer: {
    static: path.resolve(__dirname, "public"),
    port: 8080,
    open: true,
  },
};
```

## 支持 CSS

- <a href="https://www.npmjs.com/package/css-loader" target="_blank">css-loader</a> 会读取源 CSS 文件，并且可以自动识别里面的 import 和 url 语句，并把对应的 CSS 内容合并过来
- <a href="https://www.npmjs.com/package/style-loader" target="_blank">style-loader</a>会返回一段脚本，此脚本会动态创建 style 标签，并把内容设置为 css-loader 传递过来的字符串

### 安装

```bash
npm i style-loader css-loader -D
```

### 使用

webpack.config.js

```js
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
module.exports = {
  mode: "development",
  devtool: false,
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [new HtmlWebpackPlugin({ template: "./src/index.html" })],
};
```

src\bg.css

```css
body {
  background-color: green;
}
```

src\index.css

```css
@import "./bg.css" body {
  color: red;
}
```

src\index.js

```js
import "./index.css";
```

## 支持 less 和 sass

### 安装

```bash
npm i less less-loader -D
npm i node-sass sass-loader -D
```

### 使用

webpack.config.js

```js{14,15}
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
module.exports = {
  mode: "development",
  devtool: false,
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  module: {
    rules: [
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
     + { test: /\.less$/, use: ["style-loader", "css-loader", "less-loader"] },
     + { test: /\.scss$/, use: ["style-loader", "css-loader", "sass-loader"] },
    ],
  },
  plugins: [new HtmlWebpackPlugin({ template: "./src/index.html" })],
};
```

src\index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>webpack5</title>
  </head>
  <body>
    +
    <div id="less-container">less-container</div>
    +
    <div id="sass-container">sass-container</div>
  </body>
</html>
```

src\less.less

```less
@color: blue;
#less-container {
  color: @color;
}
```

src\sass.scss

```scss
$color: orange;
#sass-container {
  color: $color;
}
```

### options

```js
{
 loader:'css-loader',
 options:{
   url:true, // 是否解析通过url引入的文件,像background-image: url(./xxx.png)
   import:true, // 是否解析通过@import引入的文件,像@import './xxx.css'
   modules:true, // 通过import style from '...'后，style会是一个对象
   sourceMap:true,
   importLoaders:0, // 在走css-loader之前，使用几个loader处理，如果下面还有一个postcss-loader,那么是不会走postcss-loader,如不会添加浏览器前缀
   esModule:true // 是否是esModule导入的，是的话则需要使用style.default
 }
}
```

## CSS 兼容性

- 为了浏览器的兼容性，有时候我们必须加入-webkit,-ms,-o,-moz 这些前缀
  - Trident 内核：主要代表为 IE 浏览器, 前缀为-ms
  - Gecko 内核：主要代表为 Firefox, 前缀为-moz
  - Presto 内核：主要代表为 Opera, 前缀为-o
  - Webkit 内核：产要代表为 Chrome 和 Safari, 前缀为-webkit
- 伪元素::placeholder 可以选择一个表单元素的占位文本，它允许开发者和设计师自定义占位文本的样式。

### 安装

- <a href="https://caniuse.com/" target="_blank">https://caniuse.com/</a>
- <a href="https://github.com/webpack-contrib/postcss-loader" target="_blank">postcss-loader</a> 可以使用 PostCSS 处理 CSS
- <a href="https://github.com/csstools/postcss-preset-env" target="_blank">postcss-preset-env</a> 把现代的 CSS 转换成大多数浏览器能理解的
- PostCSS Preset Env 已经包含了 `autoprefixer` 和 `browsers` 选项

```bash
npm i postcss-loader postcss-preset-env -D
```

**postcss.config.js**

```js
let postcssPresetEnv = require("postcss-preset-env");
module.exports = {
  plugins: [
    postcssPresetEnv({
      browsers: "last 5 version",
    }),
  ],
};
```

**webpack.config.js**

```js{13-15}
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
  mode: 'development',
  devtool: false,
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
+     { test: /\.css$/, use: ['style-loader', 'css-loader','postcss-loader'] },
+     { test: /\.less$/, use: ['style-loader','css-loader','postcss-loader','less-loader'] },
+     { test: /\.scss$/, use: ['style-loader','css-loader','postcss-loader','sass-loader'] }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './src/index.html' })
  ]
};
```

**package.json**

```json{2-12}
{
+  "browserslist": {
+    "development": [
+      "last 1 chrome version",
+      "last 1 firefox version",
+      "last 1 safari version"
+    ],
+    "production": [
+      ">0.2%"
+    ]
+  }
+}
```

## 资源模块

- 资源模块是一种模块类型，它允许使用资源文件(字体、图标等)而无需配置额外的 loader
- `raw-loader` => `asset/source` 导出资源的源代码
- `file-loader` => `asset/resource` 发送一个单独的文件并导出 URL
- `url-loader` => `asset/inline` 导出一个资源的 data URI 把文件内容变成 base64 字符串返回
- asset 在导出一个 data URI 和发送一个单独的文件之间自动选择。之前通过使用 `url-loader`，并且配置资源体积限制实现

**webpack.config.js**

```js{19-39}
module.exports = {
   module:{
       rules: [
           {
               test: /\.js$/,
               use: [
                   {
                       loader: 'babel-loader',
                       options: {
                           presets: [
                               "@babel/preset-react"
                           ]
                       },

                   }
               ],
               exclude:/node_modules/
           },
+           {
+               test: /\.png$/,
+               type: 'asset/resource'
+           },
+           {
+               test: /\.ico$/,
+               type: 'asset/inline'
+           },
+           {
+               test: /\.txt$/,
+               type: 'asset/source'
+           },
+           {
+               test: /\.jpg$/,
+               type: 'asset', // 如果只写asset,会自动根据文件大小进行选择处理
+               parser: { // 如果文件大于4K，就产出生成一个新的文件，并返回新的文件路径，否则就返回内容的base64字符串
+                   dataUrlCondition: {
+                     maxSize: 4 * 1024 // 4kb
+                   }
+               }
+           }
       ]
   },
 experiments: {
   asset: true
 },
};
```

**src\index.js**

```js{1-5}
+ import png from './assets/logo.png';
+ import ico from './assets/logo.ico';
+ import jpg from './assets/logo.jpg';
+ import txt from './assets/logo.txt';
+ console.log(png,ico,jpg,txt);
```

## JS 兼容性处理

- Babel 其实是一个编译 JavaScript 的平台，可以把 ES6/ES7...、React 的 JSX 转译为 ES5

### @babel/preset-env

- Babel 默认之转换最新 ES 语法，比如箭头函数

#### 依赖安装

- <a href="https://www.npmjs.com/package/babel-loader" target="_blank">babel-loader</a> 使用 Babel 和 webpack 转译 JavaScript
- <a href="https://www.npmjs.com/package/@babel/core" target="_blank">@babel/core</a> Babel 编译的核心包
- <a href="https://www.babeljs.cn/docs/babel-preset-env" target="_blank">babel-preset-env</a>
- <a href="https://www.npmjs.com/package/@babel/preset-react" target="_blank">@babel/preset-react</a> React 插件的 Babel 预设
- <a href="https://babeljs.io/docs/en/babel-plugin-proposal-decorators" target="_blank">@babel/plugin-proposal-decorators</a> 把类和对象装饰器变异成 ES5
- <a href="https://babeljs.io/docs/en/babel-plugin-proposal-class-properties" target="_blank">@babel/plugin-proposal-class-properties</a> 转换静态类属性以及使用属性初始化语法声明的属性

```bash
npm i babel-loader @babel/core @babel/preset-env @babel/preset-react  -D
npm i @babel/plugin-proposal-decorators @babel/plugin-proposal-class-properties @babel/plugin-proposal-private-property-in-object  @babel/plugin-proposal-private-methods -D
```

**webpack.config.js**

```js{14-28}
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
module.exports = {
  mode: 'development',
  devtool: false,
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
  },
  module: {
    rules: [
+      {
+        test: /\.jsx?$/,
+        use: {
+          loader: 'babel-loader',
+          options: {
+            presets: ["@babel/preset-env", '@babel/preset-react'],
+            plugins: [
+              ["@babel/plugin-proposal-decorators", { legacy: true }],
+              ["@babel/plugin-proposal-private-property-in-object", { "loose": true }],
+              ["@babel/plugin-proposal-private-methods", { "loose": true }],
+              ["@babel/plugin-proposal-class-properties", { loose: true }],
+            ],
+          },
+        },
+      },
      { test: /\.css$/, use: ['style-loader', 'css-loader', 'postcss-loader'] },
      { test: /\.less$/, use: ['style-loader', 'css-loader','postcss-loader', 'less-loader'] },
      { test: /\.scss$/, use: ['style-loader', 'css-loader', 'postcss-loader','sass-loader'] },
      {
        test: /\.(jpg|png|gif|bmp|svg)$/,
        type:'asset/resource',
        generator:{
          filename:'images/[hash][ext]'
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './src/index.html' })
  ]
};
```

## ESLint 代码校验

### 安装

- <a href="https://eslint.bootcss.com/docs/user-guide/getting-started" target="_blank">eslint</a>
- <a href="https://www.npmjs.com/package/eslint-loader" target="_blank">eslint-loader</a>
- <a href="https://eslint.bootcss.com/docs/user-guide/configuring" target="_blank">configuring</a>
- <a href="https://www.npmjs.com/package/babel-eslint" target="_blank">babel-eslint</a>
- <a href="https://cloud.tencent.com/developer/chapter/12618" target="_blank">Rules</a>
- <a href="https://segmentfault.com/a/1190000008742240" target="_blank">ESlint 语法检测配置说明</a>

```bash
npm install eslint eslint-loader babel-eslint --D
```

**webpack.config.js**

```js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
module.exports = {
  mode: 'development',
  devtool: false,
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
+      {
+        test: /\.jsx?$/,
+        loader: 'eslint-loader',
+        enforce: 'pre',
+        options: { fix: true },
+        exclude: /node_modules/,
+      },
      {
        test: /\.jsx?$/,
        use: {
          loader: 'babel-loader',
          options: {
            "presets": ["@babel/preset-env"],
            "plugins": [
              ["@babel/plugin-proposal-decorators", { legacy: true }],
              ["@babel/plugin-proposal-private-property-in-object", { "loose": true }],
              ["@babel/plugin-proposal-private-methods", { "loose": true }],
              ["@babel/plugin-proposal-class-properties", { loose: true }],
            ]
          }
        },
        include: path.join(__dirname, 'src'),
        exclude: /node_modules/
      },
      { test: /\.css$/, use: ['style-loader', 'css-loader', 'postcss-loader'] },
      { test: /\.less$/, use: ['style-loader', 'css-loader','postcss-loader', 'less-loader'] },
      { test: /\.scss$/, use: ['style-loader', 'css-loader', 'postcss-loader','sass-loader'] },
      {
        test: /\.(jpg|png|bmp|gif|svg)$/, use: [{
          loader: 'url-loader', options: {
            limit: 10
          }
        }]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './src/index.html' })
  ]
};
```

**eslintrc.js**

```js
module.exports = {
  // root: true,
  parser: "babel-eslint", // 解析器，支持es6
  extends: "airbnb", // 继承airbnb的配置
  parserOptions: {
    // 解析器选项 模块 es6
    sourceType: "module",
    ecmaVersion: "2015",
  },
  env: {
    // 指定脚本运行环境
    browser: true, // 浏览器环境
    node: true, // node环境
  },
  rules: {
    indent: "off", // 缩进
    quotes: "off", // 引号
    "no-console": "error", // console检查
    "linebreak-style": 0,
    "comma-dangle": 0,
    "no-param-reassign": 0,
  },
};
```

### airbnb

- <a href="https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb" target="_blank">eslint-config-airbnb</a>

```bash
npm i eslint-config-airbnb eslint-loader eslint eslint-plugin-import eslint-plugin-react eslint-plugin-react-hooks and eslint-plugin-jsx-a11y -D
```

**eslintrc.js**

```js
module.exports = {
  parser: "babel-eslint",
  extends: "airbnb",
  rules: {
    semi: "error",
    "no-console": "off",
    "linebreak-style": "off",
    "eol-last": "off",
    //"indent":["error",2]
  },
  env: {
    browser: true,
    node: true,
  },
};
```

### 自动修复

- 安装 vscode 的 eslint 插件
- 配置自动修复参数
  **vscode\settings.json**

```json
{
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 服务器代理

如果你有单独的后端开发服务器 API，并且希望在同域名下发送 API 请求 ，那么代理某些 URL 会很有用。

### 不修改路径

- 请求到 /api/users 现在会被代理到请求 http://localhost:3000/api/users。

```
devServer: {
 proxy: {
   "/api": 'http://localhost:3000'
 }
}
```

### 修改路径

如果后端接口中没有`/api`前缀的时候，需要去掉前缀

```
devServer: {
  proxy: {
      "/api": {
       target: 'http://localhost:3000',
       pathRewrite:{"^/api":""}
      }
  }
}
```

### onBeforeSetupMiddleware

- onBeforeSetupMiddleware 在 webpack-dev-server 静态资源中间件处理之前，可以用于拦截部分请求返回特定内容，或者实现简单的 mock

```js

devServer: {
onBeforeSetupMiddleware(devServer){// express()
    devServer.app.get('/api/users', (req, res) => {
      res.json([{ id: 1 }, { id: 2 }]);
    });
}
}
```

### webpack-dev-middleware

<a href="https://www.npmjs.com/package/package" target="_blank">webpack-dev-middleware</a> 就是在 Express 中提供 `webpack-dev-server` 静态服务能力的一个中间件

```bash
npm install webpack-dev-middleware --save-dev
```

```js
const express = require("express");
const app = express();
const webpack = require("webpack");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackOptions = require("./webpack.config");
webpackOptions.mode = "development";
const compiler = webpack(webpackOptions);
app.use(webpackDevMiddleware(compiler, {}));
app.listen(3000);
```

- webpack-dev-server 的好处是相对简单，安装依赖直接指定命令即可
- webpack-dev-middleware 的好处是可以在既有的 `Express` 代码基础上快速添加 webpack-dev-server 的功能，同时利用 Express 来根据需要添加更多的功能，如 mock 服务、代理 API 请求等
