---
title: Rollup 插件机制
date: 2022-07-12
category: 工程化
tags: [Rollup, 插件]
---

- `Rollup`是一个`JavaScript`模块打包器，可以将小块代码编译成大块复杂的代码，例如`library`或应用程序

**debug.js**

```js
import { rollup, watch } from "rollup";
import InputOptions from "./rollup.config.js";

(async function () {
  // 打包阶段
  const bundle = await rollup(InputOptions);
  // 生成阶段
  await bundle.generate(InputOptions.output);
  // 写入阶段
  await bundle.write(InputOptions.output);
  // 监听文件变化，如果不手动关闭，会一直监听
  const watcher = watch(InputOptions);
  watcher.on("event", (event) => {
    console.log(event);
  });
  setTimeout(() => {
    watcher.close(); // 手动关闭watcher监听
  }, 2000);
  // 关闭阶段
  await bundle.close();
})();
```

**rollup.config.js**

```js
export default {
  input: "./src/index.js",
  output: {
    dir: "dist",
  },
};
```

- <a href="https://www.rollupjs.com/guide/plugin-development" target="_blank">Rollup 插件</a> 是一个具有以下描述的一个或多个`属性`、`构建钩子`和`输出生成钩子`的对象，它遵循我们的约定。插件应该作为一个包分发，该包导出一个可以使用插件特定选项调用的函数并返回这样一个对象
- <a href="https://github.com/rollup/awesome" target="_blank">插件列表</a>

## 插件规范

- 插件应该有一个清晰的名称，带有`rollup-plugin-prefix`
- 在 package.json 中包含插件关键字
- 插件应该经过测试。我们推荐 mocha 或 ava，它们支持开箱即用的 Promise
- 尽可能使用异步方法。
- 如果合适的话，确保你的插件输出正确的 sourcemap
- 如果您的插件使用“虚拟模块”（例如，用于辅助功能），请在模块 ID 前面加上`\0`。这会阻止其他插件尝试处理它

## 插件属性

### name

- 插件名称(字符串)，用于错误信息和警告

### Hooks

- 在各个阶段调用的钩子

## Build Hooks

- 为了与构建过程交互，插件对象包括"钩子"
- 钩子是在构建新的不同阶段调用的函数
- 钩子可以影响构建的运行方式，提供关于构建的信息或者在构建完成后修改构建
- 有不同种类的钩子
  - `async(异步)`钩子还可以返回解析为相同类型值的`promise`，否则钩子将被标记为 `sync(同步)`
  - `first(保险钩子)`如果有几个插件实现了这个钩子，钩子将会按照顺序执行，直到钩子返回一个`非undefined`或者`非null`的值，如果有一个钩子返回了值，那么后续插件的此钩子将不再执行
  - `sequential(串行钩子)`如果几个插件实现了这个钩子，钩子将会按照指定的插件顺序执行。如果一个钩子是异步的，那么后续对应的钩子将会等待当前钩子解析完成
  - `parallel(并行钩子)`如果多个插件实现了这个钩子，那么将按照顺序执行。如果一个钩子是异步的，那么后续钩子将会并行执行，而不是等待当前钩子执行完成
- ` Build Hooks`在构建阶段运行，该阶段由`rollup.rollup(inputOptions)`触发
- 主要负责在`rollup`处理文件之前定位、提供和转换输入文件
- 构建阶段第一个钩子是`options`,最后一个钩子总是`buildEnd`
- 如果出现生成错误，将在此后调用`closeBundle`

**rollup.config.js**

```js
import fs from "fs";

function build() {
  return {
    name: "build",
    async watchChange(id, change) {
      console.log("watchChange", id, change);
    },
    async closeWatcher() {
      console.log("closeWatcher");
    },
    async options(inputOptions) {
      console.log("options");
      //inputOptions.input = './src/main.js';
    },
    async buildStart(inputOptions) {
      console.log("buildStart");
    },
    async resolveId(source, importer) {
      if (source === "virtual") {
        console.log("resolveId", source);
        //如果resolveId钩子有返回值了，那么就会跳过后面的查找逻辑，以此返回值作为最终的模块ID
        return source;
      }
    },
    //加载此模块ID对应的内容
    async load(id) {
      if (id === "virtual") {
        console.log("load", id);
        return `export default "virtual"`;
      }
    },
    async shouldTransformCachedModule({ id, code, ast }) {
      console.log("shouldTransformCachedModule");
      //不使用缓存，再次进行转换
      return true;
    },
    async transform(code, id) {
      console.log("transform");
    },
    async moduleParsed(moduleInfo) {
      console.log("moduleParsed");
    },
    async resolveDynamicImport(specifier, importer) {
      console.log("resolveDynamicImport", specifier, importer);
    },
    async buildEnd() {
      console.log("buildEnd");
    },
  };
}
export default build;
```

**rollup.config.js**

```js{1,7-9}
import build from './plugins/rollup-plugin-build.js';
export default {
  input: "./src/index.js",
  output: [{
    dir: 'dist',
  }],
  plugins: [
   build()
  ]
}
```

![构建钩子](/images/notes/rollup/build-hooks.jpg)

### options

| 字段          | 值                                               |
| ------------- | ------------------------------------------------ |
| Type          | (options: InputOutput) => InputOptions 或者 null |
| Kind          | async, sequential                                |
| Previous Hook | 这是构建阶段第一个钩子                           |
| Next Hook     | buildStart                                       |

- 替换或操作传递给 `rollup`的选项对象,也就是`rollup.config.js`文件中的配置对象
- 返回 `null` 的话不会替换任何内容
- 如果只是需要阅读 options,直接使用`buildStart`，这个钩子考虑了所有选项钩子的转换后，该钩子可以访问的选项
- 唯一一个无法访问大多数插件上下文使用程序功能的钩子，因为实在完全配置汇总之前运行的

### buildStart

| 字段          | 值                           |
| ------------- | ---------------------------- |
| Type          | (options) => void            |
| Kind          | async, parallel              |
| Previous Hook | options                      |
| Next Hook     | resolveId 并行解析每个入口点 |

- 每次`rollup.rollup build`都要调用此钩子
- 当您需要访问传递给 rollup 的选项时，建议使用这个钩子
- 因为它考虑了所有`options`钩子的转换，还包含未设置选项的正确默认值

### resolveId

| 字段          | 值                                                                                                                                                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type          | (source,importer,options) => string                                                                                                                                                                                                                |
| Kind          | async, parallel                                                                                                                                                                                                                                    |
| Previous Hook | `buildStart`(如果我们正在解析入口点)，`moduleParsed`（如果我们正在解析导入），或者作为`resolveDynamicImport`的后备方案。此外，这个钩子可以在构建阶段通过调用插件钩子触发。`emitFile`发出一个入口点，或在任何时候通过调用此。`resolve`可手动解析 id |
| Next Hook     | 如果解析的 id 尚未加载，则`load`，否则`buildEnd`                                                                                                                                                                                                   |

- 定义自定义解析器
- 解析程序可用于定位第三方依赖关系等。这里`source`是导入语句中所写的导入对象,`importer`是导入模块的绝对路径，`source => './hello.js', importer => index.js的绝对路径`

```js
// index.js
import hello from "./hello.js";
```

- 在解析入口点时，`importer`通常是`undefined`
- 如果是通过`this.emitFile`生成的入口点。在这里，可以提供一个`importer`参数
- `options.isEntry`表示是否正在解析用户定义的入口点、发出的块，或者是否为此提供了 isEntry 参数。解析上下文函数
- 返回`null`将遵循其他`resolveId`函数，最终遵循默认的解析
- 返回`false`信号，表示源应被视为外部模块，不包括在`bundle`中
  **index.js**

```js
import virtual from "virtual-module"; // 例如这是虚拟模块
console.log(virtual);
```

### load

| 字段          | 值                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Type          | (id) => string 或者 null                                                                                                                   |
| Kind          | async, first                                                                                                                               |
| Previous Hook | 解析加载 id 的`resolveId`或`resolveDynamicImport`。此外，这个钩子可以在任何时候从插件钩子中通过调用`this.load`来触发预加载与 id 对应的模块 |
| Next Hook     | `transform`可在未使用缓存或没有使用相同代码的缓存副本时转换加载的文件，否则应使用`TransformCachedModule `                                  |

- 自定义加载程序
- 返回`null`会推迟到其他加载函数（最终是从文件系统加载的默认行为）
- 为了防止额外的解析开销，例如这个钩子已经使用了这个。parse 出于某种原因，为了生成 AST，这个钩子可以选择性地返回`{code，AST，map}`对象。ast 必须是标准的`ESTree ast`，每个节点都有开始和结束属性。如果转换不移动代码，可以通过将`map = null`来保留现有的`source maps`。否则可能需要生成源映射

**index.js**

```js
/*
需要加一个polyfill
最终结果
import 'polyfill';
console.log('index.js')
*/
console.log("index.js");
```

**plugins/rollup-plugin-polyfill.js**

```js
//我们在polyfill id前面加上\0，告诉其他插件不要尝试加载或转换它
const POLYFILL_ID = "\0polyfill";
const PROXY_SUFFIX = "?inject-polyfill-proxy";

export default function injectPolyfillPlugin() {
  return {
    name: "inject-polyfill",
    async resolveId(source, importer, options) {
      if (source === POLYFILL_ID) {
        //重要的是，对于polyfills，应始终考虑副作用
        //否则，使用`treeshake.moduleSideEffects:false`可能会阻止包含polyfill
        return { id: POLYFILL_ID, moduleSideEffects: true };
      }
      if (options.isEntry) {
        //确定实际的入口是什么。我们需要skipSelf来避免无限循环。
        const resolution = await this.resolve(source, importer, {
          skipSelf: true,
          ...options,
        });
        //如果它无法解决或是外部的，只需返回它，这样Rollup就可以显示错误
        if (!resolution || resolution.external) return resolution;
        //在代理的加载钩子中，我们需要知道入口是否有默认导出
        //然而，在那里，我们不再有完整的“解析”对象，它可能包含来自其他插件的元数据，这些插件只在第一次加载时添加
        //仅在第一次加载时添加。因此我们在这里触发加载。
        const moduleInfo = await this.load(resolution);
        //我们需要确保即使对于treeshake来说，原始入口点的副作用也得到了考虑。moduleSideEffects:false。
        //moduleSideEffects是ModuleInfo上的一个可写属性
        moduleInfo.moduleSideEffects = true;
        //重要的是，新入口不能以\0开头，并且与原始入口具有相同的目录，以免扰乱相对外部导入的生成
        //此外，保留名称并在末尾添加一个“？查询”可以确保preserveModules将为该条目生成原始条目名称
        return `${resolution.id}${PROXY_SUFFIX}`;
      }
      return null;
    },
    load(id) {
      if (id === POLYFILL_ID) {
        // 替换为实际的polyfill import '@babel/polyfill'
        return "console.log('polyfill');";
      }
      if (id.endsWith(PROXY_SUFFIX)) {
        const entryId = id.slice(0, -PROXY_SUFFIX.length);
        //我们知道ModuleInfo.hasDefaultExport是可靠的，因为我们在等待在resolveId中的this.load
        // We know ModuleInfo.hasDefaultExport is reliable because we awaited this.load in resolveId
        const { hasDefaultExport } = this.getModuleInfo(entryId);
        let code =
          `import ${JSON.stringify(POLYFILL_ID)};` +
          `export * from ${JSON.stringify(entryId)};`;
        //命名空间重新导出不会重新导出默认值，因此我们需要在这里进行特殊处理
        if (hasDefaultExport) {
          code += `export { default } from ${JSON.stringify(entryId)};`;
        }
        return code;
      }
      return null;
    },
  };
}
```

### transform

**plugins/rollup-plugin-babel.js**

```js
import { createFilter } from "@rollup/pluginutils";
import babel from "@babel/core";
function plugin(pluginOptions = {}) {
  const defaultExtensions = [".js", ".jsx"];
  const { exclude, include, extensions = defaultExtensions } = pluginOptions;
  const extensionRegExp = new RegExp(`(${extensions.join("|")})$`);
  const userDefinedFilter = createFilter(include, exclude);
  const filter = (id) => extensionRegExp.test(id) && userDefinedFilter(id);
  return {
    name: "babel",
    async transform(code, filename) {
      if (!filter(filename)) return null;
      let result = await babel.transformAsync(code);
      return result;
    },
  };
}
export default plugin;
```

### shouldTransformCachedModule

| 字段          | 值                                                                                    |
| ------------- | ------------------------------------------------------------------------------------- |
| Type          | ({id, code, ast, resoledSources, moduleSideEffects, syntheticNamedExports) => boolean |
| Kind          | async, first                                                                          |
| Previous Hook | `load` 加载缓存文件以将其代码与缓存版本进行比较的位置                                 |
| Next Hook     | `moduleParsed` 如果没有插件返回`true`那么下一个是` transform`                         |

- 如果使用了`Rollup`缓存（例如，在监视模式下或通过 JavaScript API 显式使用），如果在加载钩子之后，加载的代码与缓存副本的代码相同，则 Rollup 将跳过模块的转换钩子
- 为了防止这种情况，丢弃缓存的副本，而是转换一个模块，插件可以实现这个钩子并返回 true。
- 这个钩子还可以用来找出缓存了哪些模块，并访问它们缓存的元信息
- 如果一个插件没有返回 true，Rollup 将触发其他插件的这个钩子，否则将跳过所有剩余的插件。

### moduleParsed

| 字段          | 值                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------- |
| Type          | (moduleInfo: ModuleInfo) => void                                                                   |
| Kind          | async, parallel                                                                                    |
| Previous Hook | `transform` 转换当前处理的文件的位置                                                               |
| Next Hook     | `resolveId` 和 `resolveDynamicImport` 并行解析所有发现的静态和动态导入（如果存在），否则`buildEnd` |

- 每当模块被`Rollup`完全解析时，就会调用这个钩子。看看`this.getModuleInfo`了解传递给这个钩子的信息
- 与`transform`钩子不同，这个钩子从不缓存，可以用来获取缓存模块和其他模块的信息，包括元属性的最终形状、代码和 ast

### resolveDynamicImport

| 字段          | 值                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| Type          | (specifier, importer) => string                                                                           |
| Kind          | async, first                                                                                              |
| Previous Hook | `moduleParsed` 已为导入文件分配模块                                                                       |
| Next Hook     | `load` 如果钩子使用尚未加载的 id ,如果动态导入包含字符串且钩子未解析，请加载`resolveId`，否则`为buildEnd` |

- 动态导入定义自定义解析程序
- 返回`false`表明导入应该保持原样，而不是传递给其他解析程序，从而使其成为外部的
- 与`resolveId`钩子类似，还可以返回一个对象，将导入解析为不同的 id，同时将其标记为外部
- 如果动态导入被传递一个字符串作为参数，那么从这个钩子返回的字符串将被解释为一个现有的模块 id，而返回 null 将推迟到其它解析器`resolveId`

```js
import("./msg.js").then((res) => console.log(res));
```

### buildEnd

| 字段          | 值                                                                 |
| ------------- | ------------------------------------------------------------------ |
| Type          | (error) => void                                                    |
| Kind          | async, parallel                                                    |
| Previous Hook | `moduleParsed`, `resolveId` 或者 `resolveDynamicImport`.           |
| Next Hook     | `outputOptions` 输出生成阶段的输出，因为这是构建阶段的最后一个挂钩 |

- 在`rollup`完成打包时调用，但在调用`generate`或`write`之前调用；你也可以返回一个`Promise`
- 如果在构建过程中发生错误，则会将其传递给此钩子

## Output Generation Hooks

- 输出生成钩子可以提供有关生成的包的信息，并在完成后修改构建
- 输出生成阶段的第一个钩子是`outputOptions`
- 最后一个钩子要么`generateBundle`是通过成功生成输出,或者在输出生成过程中的任何时候发生错误 `renderError`
- `closeBundle`可以作为最后一个钩子调用，但需要手动调用`bundle.close()`以触发此钩子

**rollup.config.js**

```js{2,6}
import build from "./plugins/rollup-plugin-build.js";
import generation from "./plugins/rollup-plugin-generation.js";
export default {
  input: "./src/index.js",
  output: [{ dir: "dist" }],
  plugins: [build(), generation()],
};
```

**plugins/rollup-plugin-generation.js**

```js
function generation() {
  return {
    name: "rollup-plugin-generation",
    // 没有加async的都必须是同步的
    outputOptions() {
      console.log("outputOptions");
    },
    async renderStart(outputOptions) {
      console.log(outputOptions, "renderStart");
    },
    async banner() {
      console.log("banner");
    },
    async footer() {
      console.log("footer");
    },
    async intro() {
      console.log("intro");
    },
    async outro() {
      console.log("outro");
    },
    renderDynamicImport() {
      console.log("renderDynamicImport");
    },
    argumentChunkHash() {
      console.log("argumentChunkHash");
    },
    resolveFileUrl() {
      console.log("resolveFileUrl");
    },
    resolveImportMeta() {
      console.log("resolveImportMeta");
    },
    async renderChunk() {
      console.log("renderChunk");
    },
    async generateBundle() {
      console.log("generateBundle");
    },
    async writeBundle() {
      console.log("writeBundle");
    },
    async renderError() {
      console.log("renderError");
    },
    async closeBundle() {
      console.log("closeBundle");
    },
  };
}

export default generation;
```

### outputOptions

| 字段     | 值                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| 字段类型 | (outputOptions) => void                                                                                       |
| 钩子类型 | sync, OutputOptions                                                                                           |
| 上个钩子 | 如果这是第一次生成输出 `buildEnd`，否则是`generateBundle`，`writeBundle`或`renderError`取决于先前生成的输出。 |
| 下个钩子 | banner,footer,intro,outro 并行运行                                                                            |

- 输出生成阶段的第一个钩子
- 替换或操作传递给`bundle.generate()`的输出选项对象
- 返回`null`并不能替换任何东西
- 如果只需要读取输出选项，直接使用`renderStart`，因为`renderStart`钩子考虑了所有插件转换

### renderStart

| 字段     | 值                                    |
| -------- | ------------------------------------- |
| 字段类型 | (outputOptions, inputOptions) => void |
| 钩子类型 | async, parallel                       |
| 上个钩子 | outputOptions                         |
| 下个钩子 | banner,footer,intro,outro 并行运行    |

- 每次初始调用`bundle.generate()`或被`bundle.write()`调用
- 要在生成完成时收到通知，使用`generateBundle`和`renderError`钩子
- 需要访问传递给的输出选项时，建议使用`bundle.generate()`或者`bundle.write()`因为它考虑了所有`outputOptions`钩子的转换，并且还包含未设置选项的正确默认值。还接收传递给的输入选项

### banner

| 字段     | 值                                     |
| -------- | -------------------------------------- |
| 字段类型 | string                                 |
| 钩子类型 | async, parallel                        |
| 上个钩子 | renderStart                            |
| 下个钩子 | 针对每个动态导入 `renderDynamicImport` |

### footer

| 字段     | 值                                     |
| -------- | -------------------------------------- |
| 字段类型 | string                                 |
| 钩子类型 | async, parallel                        |
| 上个钩子 | renderStart                            |
| 下个钩子 | 针对每个动态导入 `renderDynamicImport` |

### intro

| 字段     | 值                                     |
| -------- | -------------------------------------- |
| 字段类型 | string                                 |
| 钩子类型 | async, parallel                        |
| 上个钩子 | renderStart                            |
| 下个钩子 | 针对每个动态导入 `renderDynamicImport` |

### outro

| 字段     | 值                                     |
| -------- | -------------------------------------- |
| 字段类型 | string                                 |
| 钩子类型 | async, parallel                        |
| 上个钩子 | renderStart                            |
| 下个钩子 | 针对每个动态导入 `renderDynamicImport` |

### renderDynamicImport

| 字段     | 值                                                                                   |
| -------- | ------------------------------------------------------------------------------------ |
| 字段类型 | ({format,moduleId,targetModuleId,customResolution}) => {left: string, right: string} |
| 钩子类型 | async, parallel                                                                      |
| 上个钩子 | banner,footer,intro,outro                                                            |
| 下个钩子 | `augmentChunkHash`对于每个在文件名中包含哈希的块                                     |

- 提供了如何呈现动态导入的控制
- 方法是替换了导入表打死的左侧参数（`import(`）,和右侧（`(`的代码）
- 返回`null`言辞到此类型其他钩子并呈现特定格式的默认值
- `format`是渲染的输出格式
- `moduleId`执行动态导入的模块的 id
- 如果导入可以解析为内部或外部 id，`targetModuleId`则将设置为此 id，否则将为`null`

**src/index.js**

```js
import("./title.js").then((result) => console.log(result));
```

**plugins/rollup-plugin-renderDynamicImport.js**

```js
export default function dynamicImportPolyfillPlugin() {
  return {
    name: "dynamic-import-polyfill",
    renderDynamicImport() {
      return {
        left: "dynamicImportPolyfill(",
        right: ", import.meta.url)",
      };
    },
  };
}
```

**dist/index.js**

```js
// 这是输出结果
dynamicImportPolyfill('./msg-ca034dda.js', import.meta.url).then(res => console.log(res.default));
// 需要自己实现polyfill
function dynamicImportPolyfill(filename, url) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.type = "module";
    script.onload = () => {
      resolve(window.mod);
    };
    const absURL = new URL(filename, url).href;
    console.log(absURL);
    const blob = new Blob([
      `import * as mod from "${absURL}";`,
      ` window.mod = mod;`], { type: "text/javascript" });
    script.src = URL.createObjectURL(blob);
    document.head.appendChild(script);
  });
```

### augmentChunkHash

| 字段     | 值                                                                                                                    |
| -------- | --------------------------------------------------------------------------------------------------------------------- |
| 字段类型 | (chunkInfo: ChunkInfo) => string                                                                                      |
| 钩子类型 | sync, parallel                                                                                                        |
| 上个钩子 | `renderDynamicImport`针对每个动态导入表达式                                                                           |
| 下个钩子 | `resolveFileUrl`, 对于每次使用`import.meta.ROLLUP_FILE_URL_referenceId`和`resolveImportMeta`所有其他访问`import.meta` |

- 可用于增加单个块的散列
- 为每个 Rollup 输出块调用
- 返回一个`false`值不会修改散列
- 真实值将传递给`hash.update`.
- 这`chunkInfo`是`generateBundle`不依赖文件名的属性的简化版本

### resolveFileUrl

- <a href="https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/import.meta" target="_blank">import.meta</a>是一个给 JavaScript 模块暴露特定上下文的元数据属性的对象。它包含了这个模块的信息，比如说这个模块的 URL。

| 字段     | 值                                                                           |
| -------- | ---------------------------------------------------------------------------- |
| 字段类型 | ({chunkId, fileName, format, moduleId, referenceId, relativePath}) => string |
| 钩子类型 | sync, first                                                                  |
| 上个钩子 | `augmentChunkHash` 对于在文件名中包含哈希的每个块                            |
| 下个钩子 | `renderChunk` 对于每个块                                                     |

- 允许自定义 Rollup 如何解析插件通过此链接发出的文件的 URL `this.emitFile`
- 默认情况下，Rollup 将生成代码
- `import.meta.ROLLUP_FILE_URL_referenceId`该代码应正确生成发出文件的绝对 URL，而与输出格式和部署代码的主机系统无关

**src/index.js**

```js
import logger from "logger";
console.log(logger);
```

**plugins/rollup-plugin-resolveFileUrl.js**

```js
function resolveFileUrlPlugin(options = {}) {
  return {
    name: "resolveFileUrl",
    resolveId(source) {
      //source = logger
      if (source === "logger") {
        return source;
      }
    },
    load(importee) {
      if (importee === "logger") {
        //向输出目录里生成一个新的文件，文件名叫logger.js ,文件内容叫console.log("logger")
        let referenceId = this.emitFile({
          type: "asset",
          source: 'export default "logger"',
          fileName: "logger.js",
        });
        return `export default import.meta.ROLLUP_FILE_URL_${referenceId}`;
        // return `
        //    var loggerUrl = import.meta.ROLLUP_FILE_URL_${referenceId};
        //    import(loggerUrl).then(result=>console.log(result.default))
        //    export default loggerUrl;
        // `;
      }
    },
    //用来自定义url地址的 import  logger from
    /**
     * 所以它肯定是一个路径
    var logger = new URL('logger.js', import.meta.url).href;
     var logger = new URL('logger.js', document.baseURI).href;
     但是如果需要import logger 能打印出'logger', resolveFileUrl就没有用处，需要在load中返回
     */
    resolveFileUrl({
      fileName,
      chunkId,
      format,
      moduleId,
      referenceId,
      relativePath,
    }) {
      return `new URL('${fileName}',document.baseURI).href`;
    },
  };
}
export default resolveFileUrlPlugin;
```

### resolveImportMeta

| 字段     | 值                                                |
| -------- | ------------------------------------------------- |
| 字段类型 | (property, {chunkId, moduleId, format}) => string |
| 钩子类型 | sync, first                                       |
| 上个钩子 | `augmentChunkHash` 对于在文件名中包含哈希的每个块 |
| 下个钩子 | `renderChunk` 对于每个块                          |

- 允许自定义 Rollup 如何处理 `import.meta`,`import.meta.someProperty` 特别是 `import.meta.url`
- 在 ES 模块中，`import.meta` 是一个对象，`import.meta.url` 包含当前模块的 URL

### renderChunk

| 字段     | 值                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| 字段类型 | (code, chunk, options) => string                                                                                           |
| 钩子类型 | async, sequential                                                                                                          |
| 上个钩子 | `resolveFileUrl`对于 `. `的每次使用`import.meta.ROLLUP_FILE_URL_referenceId`和`resolveImportMeta`所有其他访问`import.meta` |
| 下个钩子 | `generateBundle`                                                                                                           |

- 可用于转换单个块
- 为每个`rollup`输出块文件调用。返回 null 将不应用任何转换

### generateBundle

| 字段     | 值                                                                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 字段类型 | (options, bundle, isWrite) => void                                                                                                        |
| 钩子类型 | async, sequential                                                                                                                         |
| 上个钩子 | `renderChunk`                                                                                                                             |
| 下个钩子 | `writeBundle`如果输出是通过生成的，否则这是输出生成阶段的最后一个钩子，如果生成另一个输出`bundle.write()`，可能会再次跟随`outputOptions ` |

- 在`bundle.generate()`之后调用
- 或者在` bundle.write()`把文件写入之前调用
- 要在写入文件后修改文件，请使用`writeBundle`钩子
- `writeBundle`提供正在写入或生成的文件的完整列表及其详细信息
- 可以通过从该钩子中的捆绑对象中删除文件来防止发出文件。要发出其他文件，请使用`this.emitFile`插件上下文功能

**plugins/rollup-plugin-html.js**

```js
function html() {
  return {
    name: "html",
    generateBundle(options, bundle) {
      let entryName;
      for (let filename in bundle) {
        if (bundle[filename].isEntry) {
          entryName = filename;
        }
      }
      this.emitFile({
        // emitFile是直接给bundle中新增一个文件，最后在统一输出
        type: "asset", // 表示发射一个静态文件，可以是html,css,图片等
        fileName: "index.html",
        source: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Document</title>
        </head>
        <body>
          <script src="${entryName}" type="module"></script>
        </body>
        </html>
        `,
      });
    },
  };
}

export default html;
```

### writeBundle

| 字段     | 值                                                                                            |
| -------- | --------------------------------------------------------------------------------------------- |
| 字段类型 | (options,bundle) => void                                                                      |
| 钩子类型 | async, parallel                                                                               |
| 上个钩子 | `generateBundle`                                                                              |
| 下个钩子 | 如果被调用，这是输出生成阶段的最后一个钩子，如果生成另一个输出，可能会再次跟随`outputOptions` |

- `bundle.write()`仅在写入所有文件后才调用
- 与`generateBundle`钩子类似，`bundle`提供正在写入的文件的完整列表及其详细信息

### renderError

| 字段     | 值                                                                                            |
| -------- | --------------------------------------------------------------------------------------------- |
| 字段类型 | (error: Error) => void                                                                        |
| 钩子类型 | async, parallel                                                                               |
| 上个钩子 | 从`renderStart`到 `renderChunk` 的任何钩子                                                    |
| 下个钩子 | 如果`outputOptions`被调用，这是输出生成阶段的最后一个钩子，如果生成另一个输出，可能会再次跟随 |

- `bundle.generate()`,当 `rollup` 在遇到错误时调用`bundle.write()`
- 错误被传递给这个钩子。要在生成成功完成时收到通知，使用`generateBundle`钩子

### closeBundle

| 字段     | 值                                                                                      |
| -------- | --------------------------------------------------------------------------------------- |
| 字段类型 | closeBundle: () => Promise                                                              |
| 钩子类型 | async, parallel                                                                         |
| 上个钩子 | 如果有构建错误 `buildEnd`, 否则调用`bundle.close()`，在这种情况下，这将是最后一个钩子。 |

- 可用于清理可能正在运行的任何外部服务
- `Rollup` 的 `CLI` 将确保在每次运行后调用此钩子
- 但 需要在完成生成包后手动调用`bundle.close()`

## Plugin Context

### this.emitFile

- <a href="https://rollupjs.org/guide/en/#thisemitfile" target="_blank">this.emitFile</a>
- 发出一个包含在生成输出中的新文件，并且返回一个`referenceId`, 这个 ID 可以在不同位置用于引用发出的文件
- `emitFile`有两种形式

```ts
type EmittedChunk {
  type: 'chunk';
  id: string;
  name?: string;
  fileName?: string
}
type EmittedAsset {
  type: 'asset';
  name?: string;
  fileName?: string;
  source?: string | Unit8Array
}
let referenceId1 = this.emitFile({
  type: 'asset'
})
let referenceId2 = this.emitFile({
  type: 'chunk'
})
```

### this.load

- <a href="https://rollupjs.org/guide/en/#thisload" target="_blank">this.load</a>
- 加载并解析给定 id 对应的模块，并将附加的元信息附加到模块上
- 这将触发于另一个模块导入该模块

### this.resolve

- <a href="https://rollupjs.org/guide/en/#thisresolve" target="_blank">this.load</a>
- 使用 Rollup 使用的相同插件将导入解析为模块 ID（即文件名），并确定导入是否应该是外部的
- 如果返回 null，则无法通过 Rollup 或任何插件解析导入，但用户未明确将其标记为外部
