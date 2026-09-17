---
title: Webpack 优化
date: 2022-07-06
category: 工程化
tags: [Webpack, 优化]
summary: "指定extension之后可以不用在require或是import的时候加文件扩展名,会依次尝试添加扩展名进行匹配"
---

## 缩小范围

### extensions

指定`extension`之后可以不用在`require`或是`import`的时候加文件扩展名,会依次尝试添加扩展名进行匹配

### alias

配置别名可以加快 webpack 查找模块的速度

- 每当引入`bootstrap`模块的时候，它会直接引入`bootstrap`,而不需要从`node_modules`文件夹中按模块的查找规则查找

### modules

第三方模块加载的目录

### mainFields

依赖的加载步骤

- 查找模块目录
- 读取目录下的`package.json`文件
- 如果有`package.json`文件，找到`package.json`文件中对应的`main`字段的值，读取文件，结束
- 如果没有就会找文件中的`index.js`作为入口文件

`mainFields`就是用来修改读取`package.json`文件字段的顺序

### mainFiles

在没有`package.json`文件的情况下，默认使用目录下`index.js`文件作为入口，`mainFiles`就是用来修改入口文件的

### resolveLoader

用来配置解析 loader 时的 resolve 配置，配置项同 resolve

**webpack.config.js**

```js
const path = require("path");
const bootstrap = path.resolve("node_modules/bootstrap/dist/css/bootstrap.css");
module.exports = {
  resolve: {
    // 找第三方依赖的
    // 配置文件扩展名，在引入模块的时候，如果没有写后缀，会按照这个顺序
    extensions: [".js", ".jsx", ".tsx", ".json"],
    // 配置模块的别名
    alias: {
      bootstrap,
      "@": "./src",
    },
    // 配置第三方模块所在目录, 在引用第三方模块会优先去modules目录下查找，没有就去node_modules中找
    modules: ["modules", "node_modules"],
    // 配置package.json中主入口文件的字段,默认是main,优先级比mainFiles高
    mainFields: ["xxx", "module", "entry", "main"],
    // 没有配置package.json的时候，找目录下的文件
    mainFiles: ["main.js", "index.js"],
  },
  resolveLoader: {
    // 查找loader的
    // 配置文件扩展名，在引入模块的时候，如果没有写后缀，会按照这个顺序
    extensions: [".js", ".jsx", ".tsx", ".json"],
    // 配置模块的别名
    alias: {
      bootstrap,
      "@": "./src",
    },
    // 配置第三方模块所在目录, 在引用第三方模块会优先去modules目录下查找，没有就去node_modules中找
    modules: ["modules", "node_modules"],
    // 配置package.json中主入口文件的字段,默认是main,优先级比mainFiles高
    mainFields: ["xxx", "module", "entry", "main"],
    // 没有配置package.json的时候，找目录下的文件
    mainFiles: ["main.js", "index.js"],
  },
};
```

### noParse

- `module.noParse` 字段可以用于哪些模块文件的内容不需要解析
- 不需要解析依赖的第三方类库可以通过这个字段来配置，提高整体的构建速度,像`jquery`、`lodash`等
  > 使用 noParse 进行忽略的模块文件中不能使用 import、require、define 等导入机制，`package.json`文件里面没有`dependence`,`devDependencies`

```js{37-40}
const path = require("path");
const bootstrap = path.resolve("node_modules/bootstrap/dist/css/bootstrap.css");
module.exports = {
  mode: "development",
  resolve: {
    // 找第三方依赖的
    // 配置文件扩展名，在引入模块的时候，如果没有写后缀，会按照这个顺序
    extensions: [".js", ".jsx", ".tsx", ".json"],
    // 配置模块的别名
    alias: {
      bootstrap,
      "@": "./src",
    },
    // 配置第三方模块所在目录, 在引用第三方模块会优先去modules目录下查找，没有就去node_modules中找
    modules: ["modules", "node_modules"],
    // 配置package.json中主入口文件的字段,默认是main,优先级比mainFiles高
    mainFields: ["xxx", "module", "entry", "main"],
    // 没有配置package.json的时候，找目录下的文件
    mainFiles: ["main.js", "index.js"],
  },
  resolveLoader: {
    // 查找loader的
    // 配置文件扩展名，在引入模块的时候，如果没有写后缀，会按照这个顺序
    extensions: [".js", ".jsx", ".tsx", ".json"],
    // 配置模块的别名
    alias: {
      bootstrap,
      "@": "./src",
    },
    // 配置第三方模块所在目录, 在引用第三方模块会优先去modules目录下查找，没有就去node_modules中找
    modules: ["modules", "node_modules"],
    // 配置package.json中主入口文件的字段,默认是main,优先级比mainFiles高
    mainFields: ["xxx", "module", "entry", "main"],
    // 没有配置package.json的时候，找目录下的文件
    mainFiles: ["main.js", "index.js"],
  },
  module: {
    noParse: /jquery|lodash/,
    // noParse: module => /jquery|lodash/.test(module)
  },
};
```

### IgnorePlugin

- `IgnorePlugin`插件用于忽略某些特定的模块，让 webpack 不讲这些指定的模块打包进去，如`moment`

**src/index.js**

```js
import moment from "moment";
import "moment/locale/zh-cn"; // 想要用中文需要自己再引入中文包
console.log(moment().format("YYYY-MMM"));
```

**webpack.config.js**

```js{48-51}
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
// const bootstrap = path.resolve('node_modules/bootstrap/dist/css/bootstrap.css');
module.exports = {
  mode: "development",
  resolve: {
    // 找第三方依赖的
    // 配置文件扩展名，在引入模块的时候，如果没有写后缀，会按照这个顺序
    extensions: [".js", ".jsx", ".tsx", ".json"],
    // 配置模块的别名
    alias: {
      // bootstrap,
      "@": "./src",
    },
    // 配置第三方模块所在目录, 在引用第三方模块会优先去modules目录下查找，没有就去node_modules中找
    modules: ["modules", "node_modules"],
    // 配置package.json中主入口文件的字段,默认是main,优先级比mainFiles高
    mainFields: ["xxx", "module", "entry", "main"],
    // 没有配置package.json的时候，找目录下的文件
    mainFiles: ["main.js", "index.js"],
  },
  resolveLoader: {
    // 查找loader的
    // 配置文件扩展名，在引入模块的时候，如果没有写后缀，会按照这个顺序
    extensions: [".js", ".jsx", ".tsx", ".json"],
    // 配置模块的别名
    alias: {
      // bootstrap,
      "@": "./src",
    },
    // 配置第三方模块所在目录, 在引用第三方模块会优先去modules目录下查找，没有就去node_modules中找
    modules: ["modules", "node_modules"],
    // 配置package.json中主入口文件的字段,默认是main,优先级比mainFiles高
    mainFields: ["xxx", "module", "entry", "main"],
    // 没有配置package.json的时候，找目录下的文件
    mainFiles: ["main.js", "index.js"],
  },
  module: {
    noParse: /jquery|lodash/,
    // noParse: module => /jquery|lodash/.test(module)
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
    }),
    new webpack.IgnorePlugin({
      contextRegExp: /moment$/, // 匹配模块文件目录
      resourceRegExp: /^\.\/locale$/, // 匹配资源目录，不将locale目录打包进去
    }),
  ],
};
```

## 打包时长分析

```js
const SpeedMeasureWebpackPlugin = require("speed-measure-webpack-plugin");
const smw = new SpeedMeasureWebpackPlugin();
module.exports = smw.wrap({});
```

## 打包文件分析

这个插件的功能是生成代码分析报告，帮助提升代码质量和网站性能

```js
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
module.exports = {
  plugins: [new BundleAnalyzerPlugin()],
};
```

## 打包成库

- <a href="https://webpack.js.org/configuration/output/#outputlibrarytarget" target="_blank">output.library</a>
- 当用 webpack 去构建一个可以被其他模块导入使用的库时要用到
- `output.library`配置导出库的名称
- `output.libraryExport` 配置要导出模块中的那些子模块需要被导出，只有在`output.libraryTarget = commonjs|commonjs2`时才有意义
- `output.libraryTarget`配置以哪种方式导出库

| libraryTarget | 使用者的引入方式                       |
| ------------- | -------------------------------------- |
| var           | 只能以`script`标签形式引入             |
| commonjs      | 只能按照 `commonjs` 规范引入           |
| commonjs2     | 只能按照 `commonjs2` 规范引入          |
| amd           | 只能按照 `amd` 规范引入                |
| this          |                                        |
| window        |                                        |
| global        |                                        |
| umd           | 可以使用`script`,`commonjs`, `amd`引入 |

**webpack.config.js**

```js
module.exports = {
  output: {
    path: path.resolve("dist"),
    filename: "main.js",
    library: "test",
    libraryTarget: "var",
  },
};
```

**index.js**

```js
module.exports = {
  add(a, b) {
    return a + b;
  },
};
```

### var(默认)

**xxx.html**

```html
<script src="./main.js"></script>
<script>
  console.log(test.add(1, 2));
</script>
```

**bundle.js**

```js
var test = (function (module) {})();
```

### commonjs

**use.js**

```js
const { test } = require("./commonjs");
const { test: test1 } = require("./commonjs2");
console.log(test.add(1, 2));
console.log(test1.add(1, 2));
```

**bundle.js**

```js
// commonjs
exports.test = function (module) {
  module.exports = { add: "xxx" };
};
// commonjs2
// module.exports.test = function(module) {module.exports = {add: 'xxx'}}
```

### this|window|global

**use.js**

```js
const { test } = require("./this");
console.log(test.add(1, 2));
```

**bundle.js**

```js
// this.test | global.test | window.test
this.test = function (module) {
  module.exports = { add: "xxx" };
};
```

### umd

```js
(function webpackUniversalModuleDefinition(root, factory) {
  if (typeof exports === "object" && typeof module === "object")
    // commonjs2
    module.exports = factory();
  else if (typeof define === "function" && define.amd)
    // amd
    define([], factory);
  else if (typeof exports === "object")
    // commonjs
    exports["MyLibrary"] = factory();
  else root["MyLibrary"] = factory(); // window
})(typeof self !== "undefined" ? self : this, function () {
  return _entry_return_;
});
```

## 提取 CSS

- 因为 CSS 和 JS 可以并行，当一个 HTML 文件很大的时候可以把 CSS 单独提取出来加载

### 安装

- <a href="https://github.com/webpack-contrib/mini-css-extract-plugin" target="_blank">mini-css-extract-plugin</a>

```bash
npm i mini-css-extract-plugin -D
```

### 使用

**webpack.config.js**

```js{6,55-65,77-80}
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const SpeedMeasureWebpackPlugin = require("speed-measure-webpack-plugin");
const webpack = require("webpack");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const swp = new SpeedMeasureWebpackPlugin();
// const bootstrap = path.resolve('node_modules/bootstrap/dist/css/bootstrap.css');
module.exports = {
  mode: "development",
  entry: "./src/index.js",
  devtool: false,
  output: {
    path: path.resolve("dist"),
    publicPath: "/",
    filename: "main.js",
    // library: 'test',
    // libraryTarget: 'umd'
  },
  resolve: {
    // 找第三方依赖的
    // 配置文件扩展名，在引入模块的时候，如果没有写后缀，会按照这个顺序
    extensions: [".js", ".jsx", ".tsx", ".json"],
    // 配置模块的别名
    alias: {
      // bootstrap,
      "@": "./src",
    },
    // 配置第三方模块所在目录, 在引用第三方模块会优先去modules目录下查找，没有就去node_modules中找
    modules: ["modules", "node_modules"],
    // 配置package.json中主入口文件的字段,默认是main,优先级比mainFiles高
    mainFields: ["xxx", "module", "entry", "main"],
    // 没有配置package.json的时候，找目录下的文件
    mainFiles: ["main.js", "index.js"],
  },
  resolveLoader: {
    // 查找loader的
    // 配置文件扩展名，在引入模块的时候，如果没有写后缀，会按照这个顺序
    extensions: [".js", ".jsx", ".tsx", ".json"],
    // 配置模块的别名
    alias: {
      // bootstrap,
      "@": "./src",
    },
    // 配置第三方模块所在目录, 在引用第三方模块会优先去modules目录下查找，没有就去node_modules中找
    modules: ["modules", "node_modules"],
    // 配置package.json中主入口文件的字段,默认是main,优先级比mainFiles高
    mainFields: ["xxx", "module", "entry", "main"],
    // 没有配置package.json的时候，找目录下的文件
    mainFiles: ["main.js", "index.js"],
  },
  module: {
    noParse: /jquery|lodash/,
    // noParse: module => /jquery|lodash/.test(module),
    rules: [
      { test: /.css$/, use: [MiniCssExtractPlugin.loader, "css-loader"] },
      {
        test: /.less$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "less-loader"],
      },
      {
        test: /.scss$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
    }),
    // new webpack.IgnorePlugin({
    //   contextRegExp: /moment$/, // 匹配模块文件目录
    //   resourceRegExp: /^\.\/locale$/ // 匹配资源目录，不将locale目录打包进去
    // }),
    // new BundleAnalyzerPlugin(),
    new MiniCssExtractPlugin({
      // filename: '[name].css' // 单独制定名称
      filename: "css/[name].css", // 指定目录和名称
    }),
  ],
};
```

## 图片加载

**webpack.config.js**

```js{65-69}
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const SpeedMeasureWebpackPlugin = require("speed-measure-webpack-plugin");
const webpack = require("webpack");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const swp = new SpeedMeasureWebpackPlugin();
// const bootstrap = path.resolve('node_modules/bootstrap/dist/css/bootstrap.css');
module.exports = {
  mode: "development",
  entry: "./src/index.js",
  devtool: false,
  output: {
    path: path.resolve("dist"),
    publicPath: "/",
    filename: "main.js",
    // library: 'test',
    // libraryTarget: 'umd'
  },
  resolve: {
    // 找第三方依赖的
    // 配置文件扩展名，在引入模块的时候，如果没有写后缀，会按照这个顺序
    extensions: [".js", ".jsx", ".tsx", ".json"],
    // 配置模块的别名
    alias: {
      // bootstrap,
      "@": "./src",
    },
    // 配置第三方模块所在目录, 在引用第三方模块会优先去modules目录下查找，没有就去node_modules中找
    modules: ["modules", "node_modules"],
    // 配置package.json中主入口文件的字段,默认是main,优先级比mainFiles高
    mainFields: ["xxx", "module", "entry", "main"],
    // 没有配置package.json的时候，找目录下的文件
    mainFiles: ["main.js", "index.js"],
  },
  resolveLoader: {
    // 查找loader的
    // 配置文件扩展名，在引入模块的时候，如果没有写后缀，会按照这个顺序
    extensions: [".js", ".jsx", ".tsx", ".json"],
    // 配置模块的别名
    alias: {
      // bootstrap,
      "@": "./src",
    },
    // 配置第三方模块所在目录, 在引用第三方模块会优先去modules目录下查找，没有就去node_modules中找
    modules: ["modules", "node_modules"],
    // 配置package.json中主入口文件的字段,默认是main,优先级比mainFiles高
    mainFields: ["xxx", "module", "entry", "main"],
    // 没有配置package.json的时候，找目录下的文件
    mainFiles: ["main.js", "index.js"],
  },
  module: {
    noParse: /jquery|lodash/,
    // noParse: module => /jquery|lodash/.test(module),
    rules: [
      { test: /.css$/, use: [MiniCssExtractPlugin.loader, "css-loader"] },
      {
        test: /.less$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "less-loader"],
      },
      {
        test: /.scss$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
      {
        test: /\.(jpg|png|gif|bmp|svg)$/,
        type: "asset/resource",
        generator: { filename: "image/[hash][ext]" },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
    }),
    // new webpack.IgnorePlugin({
    //   contextRegExp: /moment$/, // 匹配模块文件目录
    //   resourceRegExp: /^\.\/locale$/ // 匹配资源目录，不将locale目录打包进去
    // }),
    // new BundleAnalyzerPlugin(),
    new MiniCssExtractPlugin({
      filename: "[name].css", // 单独制定名称
      // filename: 'css/[name].css' // 指定目录和名称
    }),
  ],
};
```

## 压缩 CSS JS HTML

- 如果配置项的`mode = production`会自动开启压缩
- 如果`mode=node|development`,可以使用以下方式压缩
- <a href="https://www.npmjs.com/package/optimize-css-assets-webpack-plugin" target="_blank">optimize-css-assets-webpack-plugin</a> 是一个优化和压缩 CSS 资源的插件
- <a href="https://www.npmjs.com/package/terser-webpack-plugin" target="_blank">terser-webpack-plugin</a> 是一个优化和压缩 JS 资源的插件
- <a href="https://www.npmjs.com/package/html-webpack-plugin" target="_blank">html-webpack-plugin</a> 同时可以生成 index.html 和压缩 HTML 的插件

```js{8,9,12,22-29,86-89,100}
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const SpeedMeasureWebpackPlugin = require("speed-measure-webpack-plugin");
const webpack = require("webpack");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const swp = new SpeedMeasureWebpackPlugin();
const OptimizeCssAssetsWebpackPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
// const bootstrap = path.resolve('node_modules/bootstrap/dist/css/bootstrap.css');
module.exports = {
  mode: "none",
  entry: "./src/index.js",
  devtool: false,
  output: {
    path: path.resolve("dist"),
    publicPath: "/",
    filename: "main.js",
    // library: 'test',
    // libraryTarget: 'umd'
  },
  optimization: {
    // 压缩JS
    minimize: true, // 开启压缩
    minimizer: [
      // 压缩工具
      new TerserPlugin(),
    ],
  },
  resolve: {
    // 找第三方依赖的
    // 配置文件扩展名，在引入模块的时候，如果没有写后缀，会按照这个顺序
    extensions: [".js", ".jsx", ".tsx", ".json"],
    // 配置模块的别名
    alias: {
      // bootstrap,
      "@": "./src",
    },
    // 配置第三方模块所在目录, 在引用第三方模块会优先去modules目录下查找，没有就去node_modules中找
    modules: ["modules", "node_modules"],
    // 配置package.json中主入口文件的字段,默认是main,优先级比mainFiles高
    mainFields: ["xxx", "module", "entry", "main"],
    // 没有配置package.json的时候，找目录下的文件
    mainFiles: ["main.js", "index.js"],
  },
  resolveLoader: {
    // 查找loader的
    // 配置文件扩展名，在引入模块的时候，如果没有写后缀，会按照这个顺序
    extensions: [".js", ".jsx", ".tsx", ".json"],
    // 配置模块的别名
    alias: {
      // bootstrap,
      "@": "./src",
    },
    // 配置第三方模块所在目录, 在引用第三方模块会优先去modules目录下查找，没有就去node_modules中找
    modules: ["modules", "node_modules"],
    // 配置package.json中主入口文件的字段,默认是main,优先级比mainFiles高
    mainFields: ["xxx", "module", "entry", "main"],
    // 没有配置package.json的时候，找目录下的文件
    mainFiles: ["main.js", "index.js"],
  },
  module: {
    noParse: /jquery|lodash/,
    // noParse: module => /jquery|lodash/.test(module),
    rules: [
      { test: /.css$/, use: [MiniCssExtractPlugin.loader, "css-loader"] },
      {
        test: /.less$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "less-loader"],
      },
      {
        test: /.scss$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
      {
        test: /\.(jpg|png|gif|bmp|svg)$/,
        type: "asset/resource",
        generator: { filename: "image/[hash][ext]" },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
      minify: {
        collapseWhitespace: true, // 处理空格
        removeComments: true, // 处理注释
      },
    }),
    // new webpack.IgnorePlugin({
    //   contextRegExp: /moment$/, // 匹配模块文件目录
    //   resourceRegExp: /^\.\/locale$/ // 匹配资源目录，不将locale目录打包进去
    // }),
    // new BundleAnalyzerPlugin(),
    new MiniCssExtractPlugin({
      filename: "[name].css", // 单独制定名称
      // filename: 'css/[name].css' // 指定目录和名称
    }),
    new OptimizeCssAssetsWebpackPlugin(),
  ],
};
```

## 清除无用 css

- <a href="https://www.npmjs.com/package/purgecss-webpack-plugin" target="_blank">purgecss-webpack-plugin</a> 可以去除无用的 css,一般与`glob`、`glob-all`配合使用
- 必须和`mini-css-extract-plugin`配合使用
- `PATHS`是绝对路径
  **webpack.config.js**

```js{10,11,15-17,107-109}
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const SpeedMeasureWebpackPlugin = require("speed-measure-webpack-plugin");
const webpack = require("webpack");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const swp = new SpeedMeasureWebpackPlugin();
const OptimizeCssAssetsWebpackPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const PurgeCSSPlugin = require("purgecss-webpack-plugin");
const glob = require("glob");

// const bootstrap = path.resolve('node_modules/bootstrap/dist/css/bootstrap.css');

const PATHS = {
  src: path.resolve(__dirname, "src"),
};
module.exports = {
  mode: "none",
  entry: "./src/index.js",
  devtool: false,
  output: {
    path: path.resolve("dist"),
    publicPath: "/",
    filename: "main.js",
    // library: 'test',
    // libraryTarget: 'umd'
  },
  optimization: {
    // 压缩JS
    minimize: true, // 开启压缩
    minimizer: [
      // 压缩工具
      new TerserPlugin(),
    ],
  },
  resolve: {
    // 找第三方依赖的
    // 配置文件扩展名，在引入模块的时候，如果没有写后缀，会按照这个顺序
    extensions: [".js", ".jsx", ".tsx", ".json"],
    // 配置模块的别名
    alias: {
      // bootstrap,
      "@": "./src",
    },
    // 配置第三方模块所在目录, 在引用第三方模块会优先去modules目录下查找，没有就去node_modules中找
    modules: ["modules", "node_modules"],
    // 配置package.json中主入口文件的字段,默认是main,优先级比mainFiles高
    mainFields: ["xxx", "module", "entry", "main"],
    // 没有配置package.json的时候，找目录下的文件
    mainFiles: ["main.js", "index.js"],
  },
  resolveLoader: {
    // 查找loader的
    // 配置文件扩展名，在引入模块的时候，如果没有写后缀，会按照这个顺序
    extensions: [".js", ".jsx", ".tsx", ".json"],
    // 配置模块的别名
    alias: {
      // bootstrap,
      "@": "./src",
    },
    // 配置第三方模块所在目录, 在引用第三方模块会优先去modules目录下查找，没有就去node_modules中找
    modules: ["modules", "node_modules"],
    // 配置package.json中主入口文件的字段,默认是main,优先级比mainFiles高
    mainFields: ["xxx", "module", "entry", "main"],
    // 没有配置package.json的时候，找目录下的文件
    mainFiles: ["main.js", "index.js"],
  },
  module: {
    noParse: /jquery|lodash/,
    // noParse: module => /jquery|lodash/.test(module),
    rules: [
      { test: /.css$/, use: [MiniCssExtractPlugin.loader, "css-loader"] },
      {
        test: /.less$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "less-loader"],
      },
      {
        test: /.scss$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
      {
        test: /\.(jpg|png|gif|bmp|svg)$/,
        type: "asset/resource",
        generator: { filename: "image/[hash][ext]" },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
      minify: {
        collapseWhitespace: true, // 处理空格
        removeComments: true, // 处理注释
      },
    }),
    // new webpack.IgnorePlugin({
    //   contextRegExp: /moment$/, // 匹配模块文件目录
    //   resourceRegExp: /^\.\/locale$/ // 匹配资源目录，不将locale目录打包进去
    // }),
    // new BundleAnalyzerPlugin(),
    new MiniCssExtractPlugin({
      filename: "[name].css", // 单独制定名称
      // filename: 'css/[name].css' // 指定目录和名称
    }),
    new PurgeCSSPlugin({
      paths: glob.sync(`${PATHS.src}/**/*`, { nodir: true }),
    }),
    new OptimizeCssAssetsWebpackPlugin(),
  ],
};
```

## CDN

- <a href="https://www.qiniu.com/" target="_blank"> 七牛云 </a>
- CDN 又叫内容分发网络，通过把资源部署到世界各地，用户访问时按照就近原则从离用户最近的服务器获取资源，从而加速资源获取速度

### 使用缓存

- HTML 文件不缓存，放在服务器上，关闭自己服务器的缓存，静态资源的 URL 变成指向 CDN 服务器的地址
- 静态的 JavaScript、CSS、图片等文件开启 CDN 和缓存，并且文件名带上 HASH 值
- 为了并行加载不阻塞，把不同的静态资源分配到不同的 CDN 服务器上

### 域名限制

- 同一时刻针对同一个域名的资源并行请求是有限制的
- 可以把这些静态资源分散到不同的 CDN 服务商
- 多个域名会增加域名解析时间
- 可以通过在 HTML HEAD 标签加入 `<link ref="dns-prefetch" href="xxx"></link>` 去与解析域名，降低域名解析带来的延迟

### 文件指纹

- 打包后输出的文件名和后缀
- hash 一般结合 CDN 缓存来使用，通过 webpack 构建后，生成文件名自动带上对应的 MD5 值。入股偶文件内容改变，对应文件 HASH 值也会发生改变，那么音容的 URL 地址也会改变

**指纹占位符**
| 占位符名称 | 含义 |
| ---- | ---- |
| ext | 资源后缀名 |
| name | 文件名称 |
| path | 文件相对路径 |
| folder | 文件所在的文件夹 |
| hash | 每次 webpack 构建,如果内容发生了改变都会生成一个唯一的 hash 值 |
| chunkhash | 根据每一个 chunk 生成的 hash 值，来源于同一个 chunk,那么 hash 值相同 |
| contenthash | 根据内容生生 hash 值，文件内容相同，hash 值就相同 |

> 最佳实践就是,JS 使用 chunkhash, CSS 使用 contenthash

**hash**: 是整个项目的 hash 值，其根据每次编译内容计算得到，每次编译之后都会生成新的 hash,即修改任何文件都会导致所有文件的 hash 发生改变  
**chunkhash**:采用 hash 计算的话，每一次构建后生成的哈希值都不一样，即使文件内容压根没有改变。这样子是没办法实现缓存效果，我们需要换另一种哈希值计算方式，即 chunkhash,chunkhash 和 hash 不一样，它根据不同的入口文件(Entry)进行依赖文件解析、构建对应的 chunk，生成对应的哈希值。我们在生产环境里把一些公共库和程序入口文件区分开，单独打包构建，接着我们采用 chunkhash 的方式生成哈希值，那么只要我们不改动公共库的代码，就可以保证其哈希值不会受影响  
**contenthash**:使用 chunkhash 存在一个问题，就是当在一个 JS 文件中引入 CSS 文件，编译后它们的 hash 是相同的，而且只要 js 文件发生改变 ，关联的 css 文件 hash 也会改变,这个时候可以使用 mini-css-extract-plugin 里的 contenthash 值，保证即使 css 文件所处的模块里就算其他文件内容改变，只要 css 文件内容不变，那么不会重复构建

![hash的区别](/images/notes/webpack/variableHash.jpg)

### Hash

```js
function createHash() {
  return require("crypto").createHash("md5");
}
let entry = {
  entry1: "entry1",
  entry2: "entry2",
};
let entry1 = "require depModule1"; //模块entry1
let entry2 = "require depModule2"; //模块entry2

let depModule1 = "depModule1"; //模块depModule1
let depModule2 = "depModule2"; //模块depModule2
//如果都使用hash的话，因为这是工程级别的，即每次修改任何一个文件，所有文件名的hash至都将改变。所以一旦修改了任何一个文件，整个项目的文件缓存都将失效
let hash = createHash()
  .update(entry1)
  .update(entry2)
  .update(depModule1)
  .update(depModule2)
  .digest("hex");
console.log("hash", hash);
//chunkhash根据不同的入口文件(Entry)进行依赖文件解析、构建对应的chunk，生成对应的哈希值。
//在生产环境里把一些公共库和程序入口文件区分开，单独打包构建，接着我们采用chunkhash的方式生成哈希值，那么只要我们不改动公共库的代码，就可以保证其哈希值不会受影响
let entry1ChunkHash = createHash()
  .update(entry1)
  .update(depModule1)
  .digest("hex");
console.log("entry1ChunkHash", entry1ChunkHash);

let entry2ChunkHash = createHash()
  .update(entry2)
  .update(depModule2)
  .digest("hex");
console.log("entry2ChunkHash", entry2ChunkHash);

let entry1File = entry1 + depModule1;
let entry1ContentHash = createHash().update(entry1File).digest("hex");
console.log("entry1ContentHash", entry1ContentHash);

let entry2File = entry2 + depModule2;
let entry2ContentHash = createHash().update(entry2File).digest("hex");
console.log("entry2ContentHash", entry2ContentHash);
```

### HashPlugin

- 可以自己修改各种 hash 值

```js
/**
 * 三种hash
 * 1. hash compilation.hash
 * 2. chunkHash 每个chunk都会有一个hash
 * 3. contentHash 内容hash 每个文件会可能有一个hash值
 */
class HashPlugin {
  constructor(options) {
    this.options = options;
  }
  apply(compiler) {
    compiler.hooks.compilation.tap("HashPlugin", (compilation, params) => {
      //如果你想改变hash值，可以在hash生成这后修改
      compilation.hooks.afterHash.tap("HashPlugin", () => {
        let fullhash = "fullhash"; //时间戳
        console.log("本次编译的compilation.hash", compilation.hash);
        compilation.hash = fullhash; //output.filename [fullhash]
        for (let chunk of compilation.chunks) {
          console.log("chunk.hash", chunk.hash);
          chunk.renderedHash = "chunkHash"; //可以改变chunkhash
          console.log("chunk.contentHash", chunk.contentHash);
          chunk.contentHash = {
            javascript: "javascriptContentHash",
            "css/mini-extract": "cssContentHash",
          };
        }
      });
    });
  }
}
module.exports = HashPlugin;
```

**webpack.config.js**

```js{14,18}
const path = require("path");
const DonePlugin = require("./plugins/DonePlugin");
const AssetPlugin = require("./plugins/AssetPlugin");
const ZipPlugin = require("./plugins/ZipPlugin");
const HashPlugin = require("./plugins/HashPlugin");
const AutoExternalPlugin = require("./plugins/AutoExternalPlugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
  plugins: [new HashPlugin()],
};
```

## moduleIds 和 chunkIds

- module: 每一个文件其实都可以看成一个 module
- chunk: webpack 打包最终生成的代码块，代码块会生成文件，一个文件对应一个 chunk
- 在 webpack5 之前，没有从 entry 打包的 chunk 文件，都会以 1、2、3...的文件命名方式输出,删除某些些文件可能会导致缓存失效
- 在生产模式下，默认启用这些功能 chunkIds: "deterministic", moduleIds: "deterministic"，此算法采用确定性的方式将短数字 ID(3 或 4 个字符)短 hash 值分配给 modules 和 chunks
- chunkId 设置为 deterministic，则 output 中 chunkFilename 里的[name]会被替换成确定性短数字 ID
- 虽然 chunkId 不变(不管值是 deterministic | natural | named)，但更改 chunk 内容，chunkhash 还是会改变的

| 可选值        | 含义                                | 示例          |
| ------------- | ----------------------------------- | ------------- |
| natural       | 按使用顺序的数字 ID                 | 1             |
| named         | 方便吊事的高度可读性 id             | src_one_js.js |
| deterministic | 根据模块名称生成剪短的 3 位 hash 值 | 915           |
| size          | 根据模块大小生成的数字 id           | 0             |

**webpack.config.js**

```js{6-7}
const path = require("path");
module.exports = {
  mode: "development",
  devtool: false,
  optimization: {
    moduleIds: "deterministic",
    chunkIds: "deterministic",
  },
};
```

## 模块联邦

- Module Federation 的动机是为了不同开发小组间共同开发一个或者多个应用
- 应用将被划分为更小的应用块，一个应用块，可以是比如头部导航或者侧边栏的前端组件，也可以是数据获取逻辑的逻辑组件
- 每个应用块由不同的组开发
- 应用或应用块共享其他其他应用块或者库

![模块联邦](/images/notes/webpack/module-federation.png)

### Module Federation

- 使用 Module Federation 时，每个应用块都是一个独立的构建，这些构建都将编译为容器
- 容器可以被其他应用或者其他容器应用
- 一个被引用的容器被称为`remote`, 引用者被称为`host`，`remote`暴露模块给`host`,` host`则可以使用这些暴露的模块，这些模块被成为`remote`模块

### 使用

#### 参数配置

| 字段     | 类型   | 含义                                                                      |
| -------- | ------ | ------------------------------------------------------------------------- |
| name     | string | 在`remote`中是必传值，即输出的模块名，被远程引用时路径为${name}/${expose} |
| library  | object | 声明全局变量的方式，name 为 umd 的 name                                   |
| filename | string | 构建输出的名字                                                            |
| remotes  | object | 引用其他应用名及其别名的映射，使用是以 key 值作为 name                    |
| exposes  | object | 暴露资源路径及别名给其他应用的                                            |
| shared   | object | 与其他引用之间共享第三方依赖，让代码中不用重复加载同一个依赖              |

#### remote

**webpack.config.js**

```js
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      filename: "remoteEntry.js", //额外编译出来的文件名,里面会提供一些额外的模块给别人用
      name: "remote", // 一般是项目名
      remotes: {
        // 引用其他应用，key：其他应用的name,
        host: "host@http://localhost:8000/remoteEntry.js",
      },
      exposes: {
        // 暴露给其他应用
        "./NewList": "./src/NewList",
      },
      shared: {
        react: { singleton: true },
      },
    }),
  ],
};
```

**src/index.js**

```js
// 这里项目的入口文件必须使用动态导入的方式,因为加载的时候会先去加载远程的资源
import("./bootstrap");
```

**src/App.js**

```js
import React from "react";
import NewList from "./NewList";
const RemoteSlider = React.lazy(() => import("host/Slider"));
export default function App() {
  return (
    <div>
      <h3>remote 本地 新闻列表</h3>
      <NewList></NewList>
      <h3>host 远程轮播图</h3>
      <React.Suspense>
        <RemoteSlider></RemoteSlider>
      </React.Suspense>
    </div>
  );
}
```

#### host

**webpack.config.js**

```js
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      filename: "remoteEntry.js", //额外编译出来的文件名,里面会提供一些额外的模块给别人用
      name: "remote", // 一般是项目名
      remotes: {
        // 引用其他应用，key：其他应用的name,
        remote: "remote@http://localhost:3000/remoteEntry.js",
      },
      exposes: {
        // 暴露给其他应用
        "./Slider": "./src/Slider",
      },
      shared: {
        react: { singleton: true },
      },
    }),
  ],
};
```

**src/App.js**

```js
import React from "react";
import Slider from "./Slider";
const RemoteNewList = React.lazy(() => import("remote/NewList"));
export default function App() {
  return (
    <div>
      <h3>host 本地 轮播图</h3>
      <Slider></Slider>
      <h3>remote 远程 新闻列表</h3>
      <React.Suspense>
        <RemoteNewList></RemoteNewList>
      </React.Suspense>
    </div>
  );
}
```

### shared

- `shared` 配置主要使用来避免项目出现多个公共依赖

![shared](/images/notes/webpack/shared.jpg)

**webpack.config.js**

```js{15-17}
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      filename: "remoteEntry.js", //额外编译出来的文件名,里面会提供一些额外的模块给别人用
      name: "remote", // 一般是项目名
      remotes: {
        // 引用其他应用，key：其他应用的name,
        remote: "remote@http://localhost:3000/remoteEntry.js",
      },
      exposes: {
        // 暴露给其他应用
        "./Slider": "./src/Slider",
      },
      shared: {
        react: { singleton: true },
      },
    }),
  ],
};
```

> 在引用远程的时候，会比较 react 的版本，如果一致会使用远程的，如果不一致会使用自己的
