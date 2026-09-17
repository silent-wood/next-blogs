---
title: Rollup 使用
date: 2022-07-12
category: 工程化
tags: [Rollup]
---

- [rollup js](https://rollupjs.org/guide/en)是下一代 JS 模块打包器

## 背景

- webpack 打包非常繁琐，打包体积比较大
- rollup 主要是用来打包 JS 库
- vue/react/angular 都在用 rollup 作为打包工具

## 安装依赖

```bash
cnpm i @babel/core @babel/preset-env  @rollup/plugin-commonjs @rollup/plugin-node-resolve @rollup/plugin-typescript lodash rollup rollup-plugin-babel postcss rollup-plugin-postcss rollup-plugin-terser tslib typescript rollup-plugin-serve rollup-plugin-livereload -D
```

## 初次使用

### rollup 配置文件

- `Asynchronous Module Definition`异步模块定义
- ES module 是 es6 提出的新的模块化方案
- `IIFE(Immediately Invoked Function Expression)`即立即执行函数表达式(自执行函数)
- UMD 全称为`Universal Module Definition`,就是通用模块定义
- `cjs` 是 nodejs 采用的模块化标准，commonjs 使用方法是通过`require`来引入模块，使用`module.exports`来导出模块

**rollup.config.js**

```js
export default {
  input: "src/main.js",
  output: {
    file: "dist/bundle.js", //输出文件的路径和名称
    format: "es", //五种输出格式：amd/es6/iife/umd/cjs
    name: "bundleName", //当format为iife和umd时必须提供，将作为全局变量挂在window下
  },
};
```

## 支持 babel

- 为了使用新语法，可以使用 babel 来进行编译输出

**安装**

- `@babel/core`是 babel 的核心包
- `@babel/preset-env`是预设
- `@rollup/plugin-babel`是 babel 插件

**配置 babel**

- 需要添加`.babelrc`配置文件

```json
{
  "presets": [
    [
      "@babel/env",
      {
        "modules": false // 不需要转换成esModule
      }
    ]
  ]
}
```

- 添加支持 babel

```js{1,9-13}
import babel from "@rollup/plugin-babel";
export default {
  input: "src/main.js",
  output: {
    file: "dist/bundle.js", //输出文件的路径和名称
    format: "es", //五种输出格式：amd/es6/iife/umd/cjs
    name: "bundleName", //当format为iife和umd时必须提供，将作为全局变量挂在window下
  },
  plugins: [
    babel({
      exclude: "node_module/**",
    }),
  ],
};
```

## tree-shaking

- Tree-shaking 的本质是消除无用的 js 代码
- rollup 只处理函数和顶层的 import/export 变量

```js
// 这样最终打包出来,只会声明name变量
import { name, age } from "./msg";
console.log(name);
```

## 使用第三方模块

- rollup.js 编译源码中的模块引用默认只支持 ES6+的模块方式 import/export

**安装**

- `@rollup/plugin-node-resolve`告诉 rollup 如何查找外部第三方模块，即使没有 install,也会查找然后打包进去
- `@rollup/plugin-commonjs`支持导入使用 commonjs 格式的模块

```bash
cnpm install @rollup/plugin-node-resolve @rollup/plugin-commonjs lodash  --save-dev
```

**main.js**

```js
import _ from "lodash";
console.log(_);
```

**rollup.config.js**

```js{3,15-16}
import babel from "@rollup/plugin-babel";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
export default {
  input: "src/main.js",
  output: {
    file: "dist/bundle.js", //输出文件的路径和名称
    format: "es", //五种输出格式：amd/es6/iife/umd/cjs
    name: "bundleName", //当format为iife和umd时必须提供，将作为全局变量挂在window下
  },
  plugins: [
    babel({
      exclude: "node_module/**",
    }),
    resolve(), // 如何查找第三方模块
    commonjs() // 导入commonjs格式的模块
  ],
};

```

## 使用 CDN

- 引入第三方模块的时候可以使用 CDN

**src/main.js**

```js
import _ from "lodash";
import $ from "jquery";
console.log(_.concat([1, 2], 4, 5));
console.log($);
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
    <script src="https://cdn.jsdelivr.net/npm/lodash/lodash.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jquery/jquery.min.js"></script>
    <script src="bundle.cjs.js"></script>
  </body>
</html>
```

**rollup.config.js**

```js{6-9,18}
export default {
  output: {
    file: "dist/bundle.cjs.js", // 输出文件路径以及文件名
    format: "cjs", // 五种格式 amd es iife cjs umd
    name: "bundleName", // 当format为iife何umd的时候必须提供，将作为变量挂载在window下
    globals: {
      lodash: "_", // 告诉rollup全局变量_即是lodash
      jquery: "$", // 告诉rollup全局变量$即是jquery
    },
  },
  plugins: [
    babel({
      exclude: "node_module/**",  // node_modules下的文件不需要转
    }),
    resolve(), // 如何查找第三方模块
    commonjs(), // 导入commonjs格式的模块
  ],
  external: ["lodash", "jquery"],
};
```

## 支持 TS

**安装**

```bash
cnpm install tslib typescript @rollup/plugin-typescript --save-dev
```

**初始化 tsconfig.json**

```bash
tsc --init
```

```json
{
  "compilerOptions": {
    "target": "es5",
    "module": "ESNext",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**rollup.config.js**

```js{4,22}
import babel from "rollup-plugin-babel";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
export default {
  input: "src/main.ts",
  output: {
    file: "dist/bundle.cjs.js", //输出文件的路径和名称
    format: "iife", //五种输出格式：amd/es6/iife/umd/cjs
    name: "bundleName", //当format为iife和umd时必须提供，将作为全局变量挂在window下
    globals: {
      lodash: "_", //告诉rollup全局变量_即是lodash
      jquery: "$", //告诉rollup全局变量$即是jquery
    },
  },
  plugins: [
    babel({
      exclude: "node_modules/**",
    }),
    resolve(),
    commonjs(),
    typescript(),
  ],
  external: ["lodash", "jquery"],
};
```

## 压缩 JS

- terser 是支持 ES6+的 JavaScript 压缩器工具包

**安装**

```bash
cnpm install rollup-plugin-terser --save-dev
```

**rollup.config.js**

```js{5,24}
import babel from "rollup-plugin-babel";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import {terser} from 'rollup-plugin-terser'
export default {
  input: "src/main.ts",
  output: {
    file: "dist/bundle.cjs.js", //输出文件的路径和名称
    format: "iife", //五种输出格式：amd/es6/iife/umd/cjs
    name: "bundleName", //当format为iife和umd时必须提供，将作为全局变量挂在window下
    globals: {
      lodash: "_", //告诉rollup全局变量_即是lodash
      jquery: "$", //告诉rollup全局变量$即是jquery
    },
  },
  plugins: [
    babel({
      exclude: "node_modules/**",
    }),
    resolve(),
    commonjs(),
    typescript(),
    terser()
  ],
  external: ["lodash", "jquery"],
};
```

## 编译 css

**安装**

```bash
cnpm install  postcss rollup-plugin-postcss --save-dev
```

**rollup.config.js**

```js{6,26}
import babel from "rollup-plugin-babel";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import {terser} from 'rollup-plugin-terser'
import postcss from 'rollup-plugin-postcss'
export default {
  input: "src/main.ts",
  output: {
    file: "dist/bundle.cjs.js", //输出文件的路径和名称
    format: "iife", //五种输出格式：amd/es6/iife/umd/cjs
    name: "bundleName", //当format为iife和umd时必须提供，将作为全局变量挂在window下
    globals: {
      lodash: "_", //告诉rollup全局变量_即是lodash
      jquery: "$", //告诉rollup全局变量$即是jquery
    },
  },
  plugins: [
    babel({
      exclude: "node_modules/**",
    }),
    resolve(),
    commonjs(),
    typescript(),
    terser(),
    postcss()
  ],
  external: ["lodash", "jquery"],
};
```

## 本地服务器

**安装**

```bash
cnpm install rollup-plugin-serve --save-dev
```

**rollup.config.js**

```js{7,28-32}
import babel from "rollup-plugin-babel";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";
import postcss from "rollup-plugin-postcss";
import serve from "rollup-plugin-serve";
export default {
  input: "src/main.ts",
  output: {
    file: "dist/bundle.cjs.js", //输出文件的路径和名称
    format: "iife", //五种输出格式：amd/es6/iife/umd/cjs
    name: "bundleName", //当format为iife和umd时必须提供，将作为全局变量挂在window下
    globals: {
      lodash: "_", //告诉rollup全局变量_即是lodash
      jquery: "$", //告诉rollup全局变量$即是jquery
    },
  },
  plugins: [
    babel({
      exclude: "node_modules/**",
    }),
    resolve(),
    commonjs(),
    typescript(),
    terser(),
    postcss(),
    serve({
      open: true,
      port: 8888,
      contentBase: "./dist",
    }),
  ],
  external: ["lodash", "jquery"],
};
```
