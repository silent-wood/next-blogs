---
title: Vue3 开发环境配置
date: 2024-06-11
category: Vue
tags: [Vue3]
summary: "Vue3 中使用 pnpm workspace 来实现 monorepo (pnpm(https://pnpm.io/zh/)是快速、节省磁盘空间的包管理工具。主要采用符号链接的方…"
---

Vue3 中使用 `pnpm` `workspace` 来实现 `monorepo` ([pnpm](https://pnpm.io/zh/)是快速、节省磁盘空间的包管理工具。主要采用符号链接的方式管理模块)
### 安装 pnpm

```bash
npm install -g pnpm # 全局安装pnpm
```
```bash
pnpm init # 初始化配置文件
```

### 创建.npmrc 文件
```
shamefully-hoist = true
```
> 正常安装是把包直接安装在`node_modules/.pnpm`下，如果设置`shamefully-hoist=true`，则把包安装在`node_modules`下
比如安装vue，最终安装路径为 `node_modules/.pnpm/node_modules/@vue`，值修改成true后，安装目录为`node_modules/@vue`

### 创建 pnpm-workspace.yaml 文件
```
packages:
  - 'packages/*'
```

- 配置 `pnpm.workspace.yaml`
```
# 这是指定哪些包是工作目录
# 比如配置packages: 'packages/*'，则packages目录下的所有包都会被识别为工作目录
packages:
  - 'packages/*'
```

此时项目目录结构   

### 环境搭建
> 打包项目 Vue3 采用 rollup 进行打包，安装打包所需要的依赖

| 开发依赖 | |  
| ------- | --- |  
| typescript  | 在项目中支持Typescript  |  
| esbuild | 构建工具，默认支持TS |  
| minimist | 命令行参数解析 |

```bash
pnpm install typescript minimist esbuild -D -w

```

### 初始化 TS 
```bash
pnpm tsc --init
```
> 先添加常用的 `ts-config`配置，后续继续增加

```json
{
  "compilerOptions": {
    "outDir": "dist", // 输出的目录
    "sourceMap": true, // 采用sourcemap
    "target": "es2016", // 目标语法
    "module": "esnext", // 模块格式
    "moduleResolution": "node", // 模块解析方式
    "strict": false, // 严格模式
    "resolveJsonModule": true, // 解析json模块
    "esModuleInterop": true, // 允许通过es6语法引入commonjs模块
    "jsx": "preserve", // jsx 不转义
    "lib": ["esnext", "dom"] // 支持的类库 esnext及dom
  }
}

```

### 创建模块
> 现在 `packages` 目录下新建两个package
- reactivity 响应式模块
- shared 共享模块

**所有包的入口均为`src/index.ts`，这样可以是实现统一打包**

- reactivity/package.json
```json
{
  "name": "@vue/reactivity",
  "version": "1.0.0",
  "main": "index.js",
  "module": "dist/reactivity.esm-bundler.js",
  "unpkg": "dist/reactivity.global.js",
  "buildOptions": {
    "name": "VueReactivity",
    "formats": ["esm-bundler", "cjs", "global"]
  }
}

```
- shared/package.json
```json
{
  "name": "@vue/shared",
  "version": "1.0.0",
  "main": "index.js",
  "module": "dist/shared.esm-bundler.js",
  "buildOptions": {
    "formats": ["esm-bundler", "cjs"]
  }
}

```
> formats 为自定义的打包格式

- global 立即执行函数的格式，会暴露全局对象
- esm-browser 在浏览器中使用的格式，内两所有的依赖项
- esm-bundler 在打包工具中使用的格式，内两所有的依赖项
- cjs 在node中使用的格式，内两所有的依赖项

> 配置 `ts` 引用关系
```json
"baseUrl": ".",
"paths": {
    "@vue/*": ["packages/*/src"]
}

```

### 开发环境`esbuild`打包
~[工具打包速度对比](/images/notes/vue/速度对比.png)

**解析用户参数**
```json
"scripts": {
    "dev": "node scripts/dev.js reactivity -f esm"
}

```

```js
import esbuild from "esbuild"; // 打包工具
import minimist from "minimist"; // 命令行参数解析
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
const require = createRequire(import.meta.url); // 可以在es6中使用require语法
const args = minimist(process.argv.slice(2)); // 解析打包格式和打包模块
const format = args.f || "iife";
const target = args._[0] || "reactivity";

// __dirname在es6模块中不存在需要自行解析
const __dirname = dirname(fileURLToPath(import.meta.url));

const pkg = require(`../packages/${target}/package.json`);

esbuild
  .context({
    entryPoints: [resolve(__dirname, `../packages/${target}/src/index.ts`)],
    outfile: resolve(
      // 输出的文件
      __dirname,
      `../packages/${target}/dist/${target}.js`
    ),
    bundle: true, // 全部打包
    sourcemap: true, // sourcemap源码映射
    format, // 打包格式 esm , cjs, iife
    globalName: pkg.buildOptions?.name, // 全局名配置
    platform: "browser", // 平台
  })
  .then((ctx) => {
    console.log("watching~~~");
    return ctx.watch(); // 监控文件变化
  });

```

