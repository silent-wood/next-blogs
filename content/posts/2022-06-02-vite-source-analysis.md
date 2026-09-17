---
title: Vite 源码阅读
date: 2022-06-02
category: 工程化
tags: [Vite, 源码]
summary: "lib/server/middlewares/static.js"
---

**步骤分析**

- 启动 http 服务器
  - 通过`esbuild`对入口文件进行打包，同时分析其中的依赖文件
  - 碰到 js 文件，会去通过分析是否有第三方依赖
  - 将第三方依赖打包生成到`node_modules/.vite/deps`中，并在`metadata.json`中记录第三方依赖的文件以及相对路径
- 浏览器访问
  - 拦截 JS 请求
  - 获取内容，如果有第三方依赖，改写导入路径

## 实现命令行

- package.json
  > 在包的`package.json`中添加`bin`可执行文件属性

```json
{
  "bin": {
    "vite-self": "./bin/vite-self.js"
  }
}
```

- 可执行脚本
  > 新建`bin/vite-self.js`

```js
#!/usr/bin/env node
// 使用node运行
require("../lib/cli");
```

- cli.js

```js
console.log("vite-self");
```

- npm link
  > 要在命令行中使用`vite-self`命令还需要使用`npm link`会在系统中创建一个`vite-self.cmd`的可执行命令,目录为 node 安装的目录

## 实现 http 服务器

### cli.js

```js
const { createServer } = require("./server");
(async () => {
  const server = await createServer();
  server.listen(1011);
})();
```

### server/index.js

```js
const connect = require("connect");
async function createServer() {
  const middlewares = connect();
  const server = {
    async listen(port) {
      require("http")
        .createServer(middlewares)
        .listen(port, async () => {
          console.log(`dev server running at: http://localhost:${port}`);
        });
    },
  };
  return server;
}
exports.createServer = createServer;
```

## 静态文件中间件

### server/index.js

```js{2,3,5,16}
const connect = require("connect");
+const serveStaticMiddleware = require('./middlewares/static');
+const resolveConfig = require('../config');
async function createServer() {
  + const config = await resolveConfig()
  const middlewares = connect();
  const server = {
    async listen(port) {
      require("http")
        .createServer(middlewares)
        .listen(port, async () => {
          console.log(`dev server running at: http://localhost:${port}`);
        });
    },
  };
  + middlewares.use(serveStaticMiddleware(config))
  return server;
}
exports.createServer = createServer;
```

### static.js

lib/server/middlewares/static.js

```js
const static = require("serve-static");
function serveStaticMiddleware({ root }) {
  return static(root);
}
module.exports = serveStaticMiddleware;
```

### config.js

lib/config.js

```js
const { normalizePath } = require("./utils");
async function resolveConfig() {
  const root = normalizePath(process.cwd());
  let config = {
    root,
  };
  return config;
}
module.exports = resolveConfig;
```

### utils.js

lib/utils.js

```js
function normalizePath(id) {
  return id.replace(/\\/g, "/");
}
exports.normalizePath = normalizePath;
```

### index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>vite2</title>
  </head>

  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

### main.js

src/main.js

```js
console.log("main");
```

## 分析第三方依赖

第三方依赖在运行项目后，会将其打包到 `node_modules/.vite/deps/`下，同时生成一个`_metadata.json`里面保存所有的三方依赖

src/main.js

```js
import { createApp } from "vue";
console.log(createApp);
```

### optimizer/index.js

lib/optimizer/index.js

```js
const scanImports = require("./scan");
async function createOptimizeDepsRun(config) {
  const deps = await scanImports(config);
  console.log(deps);
}
exports.createOptimizeDepsRun = createOptimizeDepsRun;
```

### scan.js

lib/optimizer/scan.js

```js
const { build } = require("esbuild");
const esbuildScanPlugin = require("./esbuildScanPlugin");
const path = require("path");
async function scanImports(config) {
  const depImports = {};
  const esPlugin = await esbuildScanPlugin(config, depImports);
  await build({
    absWorkingDir: config.root,
    entryPoints: [path.resolve("./index.html")],
    bundle: true,
    format: "esm",
    outfile: "dist/index.js",
    write: true,
    plugins: [esPlugin],
  });
  return depImports;
}
module.exports = scanImports;
```

### esbuildScanPlugin.js

lib/optimizer/esbuildScanPlugin.js

```js
const fs = require("fs-extra");
const path = require("path");
const { createPluginContainer } = require("../server/pluginContainer");
const resolvePlugin = require("../plugins/resolve");
const { normalizePath } = require("../utils");
const htmlTypesRE = /\.html$/;
const scriptModuleRE = /<script\s+type="module"\s+src\="(.+?)"><\/script>/;
const JS_TYPES_RE = /\.js$/;
async function esbuildScanPlugin(config, depImports) {
  config.plugins = [resolvePlugin(config)];
  // 创建插件容器
  const container = await createPluginContainer(config);
  const resolve = async (id, importer) => {
    return await container.resolveId(id, importer);
  };
  return {
    name: "vite:dep-scan",
    setup(build) {
      // 解析加载文件的路径
      build.onResolve({ filter: htmlTypesRE }, async ({ path, importer }) => {
        const resolved = await resolve(path, importer);
        if (resolved) {
          return {
            path: resolved.id || resolved,
            namespace: "html", // 把html文件放入一个自定义的命名空间下，后面的onLoad钩子调用的时候，会过滤
          };
        }
      });
      build.onResolve({ filter: /.*/ }, async ({ path, importer }) => {
        const resolved = await resolve(path, importer);
        if (resolved) {
          const id = resolved.id || resolved;
          const included = id.includes("node_modules");
          if (included) {
            depImports[path] = normalizePath(id);
            return {
              path: id,
              external: true, // 表示是第三方模块
            };
          }
          return {
            path: id,
          };
        }
        return { path };
      });
      // 读取html文件
      build.onLoad(
        { filter: htmlTypesRE, namespace: "html" },
        async ({ path }) => {
          // 提取script模块，把html文件改成 import 'vue'返回，会走到加载模块中
          let html = fs.readFileSync(path, "utf-8");
          let [, scriptSrc] = html.match(scriptModuleRE);
          let js = `import ${JSON.stringify(scriptSrc)};\n`;
          return {
            loader: "js",
            contents: js,
          };
        }
      );
      // 读取js文件
      build.onLoad({ filter: JS_TYPES_RE }, ({ path: id }) => {
        let ext = path.extname(id).slice(1);
        let contents = fs.readFileSync(id, "utf-8");
        return {
          loader: ext,
          contents,
        };
      });
    },
  };
}
module.exports = esbuildScanPlugin;
```

### pluginContainer.js

lib/server/pluginContainer.js

```js
const { normalizePath } = require("../utils");
const path = require("path");
async function createPluginContainer({ plugins, root }) {
  class PluginContext {
    async resolve(id, importer = path.join(root, "index.html")) {
      return await container.resolveId(id, importer);
    }
  }
  const container = {
    async resolveId(id, importer) {
      let ctx = new PluginContext();
      let resolveId = id;
      for (const plugin of plugins) {
        if (!plugin.resolveId) continue;
        const result = await plugin.resolveId.call(ctx, id, importer);
        if (result) {
          resolveId = result.id || result;
          break;
        }
      }
      return { id: normalizePath(resolveId) };
    },
  };
  return container;
}
exports.createPluginContainer = createPluginContainer;
```

### resolve.js

lib/plugins/resolve.js

```js
const path = require("path");
const fs = require("fs");
const { resolve } = require("resolve");
const resolvePlugin = (config) => {
  return {
    name: "vite:resolve",
    resolveId(importee, importer) {
      // 如果是/开头表示是相对项目的绝对路径 /src/main.js => 项目根目录/src/main.js
      if (importee.startsWith("/")) {
        return { id: path.resolve(config.root, importee.slice(1)) };
      }
      // 如果是相对文件系统的绝对路径 c:/xxx/xxx/src/main.js
      if (path.isAbsolute(importee)) {
        return { id: importee };
      }
      // 如果是相对路径
      if (importee.startsWith(".")) {
        const baseDir = path.dirname(importer);
        const fsPath = path.resolve(baseDir, importee);
        return { id: fsPath };
      }
      // 剩下的就是第三方模块
      let res = tryNodeResolve(importee, importer, config);
      if (res) return res;
    },
  };
};
const tryNodeResolve = (importee, importer, config) => {
  // 在根目录下查找vue/package.json
  const pkgPath = resolve.sync(`${importee}/package.json`, {
    basedir: config.root,
  });
  const pkgDir = path.dirname(pkgPath);
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const entryPoint = pkg.module;
  const entryPointPath = path.join(pkgDir, entryPoint);
  return {
    id: entryPointPath,
  };
};
module.exports = resolvePlugin;
```

## 预编译并保存\_metadata.json

### server/index.js

lib/server/index.js

```js{11,20,21,22}
const connect = require('connect');
const http = require('http');
const serveStaticMiddleware = require('./middlewares/static');
const resolveConfig = require('../config');
const { createOptimizeDepsRun } = require('../optimizer');
async function createServer() {
  const config = await resolveConfig();
  const middlewares = connect();
  const server = {
    async listen(port) {
+     await runOptimize(config, server)
      http.createServer(middlewares).listen(port, async () => {
        console.log(`server running at http://localhost:${port}`);
      });
    }
  }
  middlewares.use(serveStaticMiddleware(config));
  return server;
}
+ async function runOptimize(config, server) {
+  const optimizeDeps = await createOptimizeDepsRun(config);
+  server._optimizeDepsMetadata = optimizeDeps.metadata
}
exports.createServer = createServer;
```

### lib/config.js

```js{1,6,9}
+const path = require('path');
const { normalizePath } = require('./utils');
async function resolveConfig() {
  //当前的根目录 window \\  linux /
  const root = normalizePath(process.cwd());
+ const cacheDir = normalizePath(path.resolve(`node_modules/.vite7`))
  let config = {
    root,
+   cacheDir
  }
  return config;
}
module.exports = resolveConfig;
```

### optimizer/index.js

lib/optimizer/index.js

```js{2-5,8-38}
const scanImports = require('./scan');
+const fs = require('fs-extra');
+const path = require('path');
+const { build } = require('esbuild');
+const { normalizePath } = require('../utils');
async function createOptimizeDepsRun(config) {
  const deps = await scanImports(config);
+ const { cacheDir } = config;
+ const depsCacheDir = path.resolve(cacheDir, 'deps')
+ const metadataPath = path.join(depsCacheDir, '_metadata.json');
+ const metadata = {
+   optimized: {}
+ }
+ for (const id in deps) {
+   const entry = deps[id]
+   metadata.optimized[id] = {
+     file: normalizePath(path.resolve(depsCacheDir, id + '.js')),// file存的是vue打包后的路径 C:\xxx\node_modules\.vite\deps\vue.js
+     src: entry // 相对文件系统中的绝对路径C:\xxx\node_modules\vue\dist\vue.runtime.esm-bundler.js
+   }
+   await build({
+     absWorkingDir: process.cwd(),
+     entryPoints: [deps[id]],
+     outfile: path.resolve(depsCacheDir, id + '.js'),
+     bundle: true,
+     write: true,
+     format: 'esm'
+   })
+ }
+ await fs.ensureDir(depsCacheDir);
+ await fs.writeFile(metadataPath, JSON.stringify(metadata, (key, value) => {
+   if (key === 'file' || key === 'src') {
+  //optimized里存的是绝对路径，此处写入硬盘的是相对于缓存目录的相对路径
+     return normalizePath(path.relative(depsCacheDir, value));
+   }
+   return value
+ }, 2));
+ return { metadata };
}
exports.createOptimizeDepsRun = createOptimizeDepsRun;
```

## 修改导入路径

当请求到`main.js`时会分析其中的依赖，解析 vue 的路径
`import { createApp } from 'vue'` 修改成 `import { createApp } from '/node_modules/.vite/deps/vue.js'`，分成以下步骤：

- 请求`/main.js`
  - 执行`resolveId`
    - `resolvePlugin`如果/开头，表示是绝对路径，返回此文件的绝对路径，`项目根目录/src/main.js`,结束`resolveId`
  - 执行`load`,返回 `null`
  - 执行`transform`
    - 执行`importAnalysisPlugin`
      - 获取依赖的`vue`,重新执行`PluginContainer.resolve`
        - 执行`preAliasPlugin`获取`vue`的相对路径`node_modules/.vite/deps/vue.js`,把`vue`变成`node_modules/.vite/deps/vue.js`
- 请求 `/node_modules/.vite/deps/vue.js`
  - 执行 `resolveId`
    - `resolvePlugin` 如果是/开头，表示绝对路径，返回此文件的绝对路径 `node_modules/.vite/deps/vue`,结束`resolveId`

### lib/server/index.js

- 使用转换请求的`transformMiddleware`中间件
- 执行`transformRequest`

```js{6-7,11,13,21-26}
const connect = require('connect');
const http = require('http');
const serveStaticMiddleware = require('./middlewares/static');
const resolveConfig = require('../config');
const { createOptimizeDepsRun } = require('../optimizer');
+const transformMiddleware = require('./middlewares/transform');
+const { createPluginContainer } = require('./pluginContainer');
async function createServer() {
  const config = await resolveConfig();
  const middlewares = connect();
+ const pluginContainer = await createPluginContainer(config)
  const server = {
+   pluginContainer,
    async listen(port) {
      await runOptimize(config, server)
      http.createServer(middlewares).listen(port, async () => {
        console.log(`server running at http://localhost:${port}`);
      });
    }
  }
+ for (const plugin of config.plugins) {
+   if (plugin.configureServer) {
+     await plugin.configureServer(server)
+   }
+ }
+ middlewares.use(transformMiddleware(server))
  middlewares.use(serveStaticMiddleware(config));
  return server;
}
async function runOptimize(config, server) {
  const optimizeDeps = await createOptimizeDepsRun(config);
  server._optimizeDepsMetadata = optimizeDeps.metadata
}
exports.createServer = createServer;
```

### transform.js

- 在中间件中对请求进行拦截，如果是 JS 请求，就对内容进行转换
  lib/server/middlewares/transform.js

```js
const { isJSRequest } = require("../../utils");
const send = require("../send");
const transformRequest = require("../transformRequest");
const { parse } = require("url");
function transformMiddleware(server) {
  return async function (req, res, next) {
    if (req.method !== "GET") {
      return next();
    }
    let url = parse(req.url).pathname;
    if (isJSRequest(url)) {
      //切记这个地方要把req.url传给transformRequest，不是url,否则会丢失query
      const result = await transformRequest(req.url, server);
      if (result) {
        const type = "js";
        return send(req, res, result.code, type);
      }
    } else {
      return next();
    }
  };
}
module.exports = transformMiddleware;
```

### utils.js

lib/utils.js

```js{5-12}
function normalizePath(id) {
  return id.replace(/\\/g, '/')
}
exports.normalizePath = normalizePath;

+const knownJsSrcRE = /\.js/
+const isJSRequest = (url) => {
+  if (knownJsSrcRE.test(url)) {
+    return true
+  }
+  return false
+}
+exports.isJSRequest = isJSRequest;
```

### pluginContainer.js

lib/server/pluginContainer.js

```js{26-46}
const { normalizePath } = require("../utils");
const path = require('path');
async function createPluginContainer({ plugins,root }) {
  class PluginContext {
   async resolve(id, importer= path.join(root, 'index.html')) {
     return await container.resolveId(id, importer)
   }
  }
  //插件容器是一个用来执行插件的容器
  const container = {
    //resolve是一个方法，是一个根据标记符计算路径的方法
    //vue=>vue在硬盘上对应路径
    async resolveId(id, importer) {
      let ctx = new PluginContext();
      let resolveId = id;
      for (const plugin of plugins) {
        if (!plugin.resolveId) continue;
        const result = await plugin.resolveId.call(ctx, id, importer);
        if (result) {
          resolveId = result.id || result;
          break;
        }
      }
      return { id: normalizePath(resolveId) }
    },
+   async load(id) {
+     const ctx = new PluginContext()
+     for (const plugin of plugins) {
+       if (!plugin.load) continue
+       const result = await plugin.load.call(ctx, id)
+       if (result !== null) {
+         return result
+       }
+     }
+     return null
+   },
+   async transform(code, id) {
+     for (const plugin of plugins) {
+       if (!plugin.transform) continue
+       const ctx = new PluginContext()
+       const result = await plugin.transform.call(ctx, code, id)
+       if (!result) continue
+       code = result.code || result;
+     }
+     return { code }
+   }
  }
  return container;
}
exports.createPluginContainer = createPluginContainer;
```

### send.js

lib/server/send.js

```js
const alias = {
  js: "application/javascript",
  css: "text/css",
  html: "text/html",
  json: "application/json",
};
function send(_req, res, content, type) {
  res.setHeader("Content-Type", alias[type] || type);
  res.statusCode = 200;
  return res.end(content);
}
module.exports = send;
```

### plugins/index.js

lib/plugins/index.js

```js
const importAnalysisPlugin = require("./importAnalysis");
const preAliasPlugin = require("./preAlias");
const resolvePlugin = require("./resolve");
async function resolvePlugins(config) {
  return [
    preAliasPlugin(config), //把vue=>vue.js
    resolvePlugin(config),
    importAnalysisPlugin(config),
  ];
}
exports.resolvePlugins = resolvePlugins;
```

### importAnalysis.js

- 导入文件分析 lib/plugins/importAnalysis.js

```js
const { init, parse } = require("es-module-lexer");
const MagicString = require("magic-string");
function importAnalysisPlugin(config) {
  const { root } = config;
  return {
    name: "vite:import-analysis",
    async transform(source, importer) {
      await init;
      let imports = parse(source)[0];
      if (!imports.length) {
        return source;
      }
      let ms = new MagicString(source);
      const normalizeUrl = async (url) => {
        //解析此导入的模块的路径
        const resolved = await this.resolve(url, importer);
        if (resolved.id.startsWith(root + "/")) {
          //把绝对路径变成相对路径
          url = resolved.id.slice(root.length);
        }
        return url;
      };
      for (let index = 0; index < imports.length; index++) {
        const { s: start, e: end, n: specifier } = imports[index];
        if (specifier) {
          const normalizedUrl = await normalizeUrl(specifier);
          if (normalizedUrl !== specifier) {
            ms.overwrite(start, end, normalizedUrl);
          }
        }
      }
      return ms.toString();
    },
  };
}
module.exports = importAnalysisPlugin;
```

### preAlias.js

- 看看是否是经过预编译的路径，如果是，直接过去构建后的路径
  lig/plugins/preAlias.js

```js
function preAliasPlugin() {
  let server;
  return {
    name: "vite:pre-alias",
    configureServer(_server) {
      server = _server;
    },
    resolveId(id) {
      //把vue=>vue.js
      const metadata = server._optimizeDepsMetadata;
      const isOptimized = metadata.optimized[id];
      if (isOptimized) {
        return {
          id: isOptimized.file, //// vue => c:/node_modules/.vite/deps/vue.js
        };
      }
    },
  };
}
module.exports = preAliasPlugin;
```

### config.js

lib/config.js

```js{3,11-12}
const path = require('path');
const { normalizePath } = require('./utils');
+const { resolvePlugins } = require('./plugins');
async function resolveConfig() {
  const root = normalizePath(process.cwd());
  const cacheDir = normalizePath(path.resolve(`node_modules/.vite`))
  let config = {
    root,
    cacheDir
  }
+ const plugins = await resolvePlugins(config);
+ config.plugins = plugins;
  return config;
}
module.exports = resolveConfig;
```

## 支持 vue 插件

### 支持自定义插件

- lib\config.js

```js{1,10-19}
const fs = require('fs-extra');
const resolveConfig = async () => {
  // root:当前命令执行所在的目录就是根目录
  const root = normalizePath(process.cwd());
  const cacheDir = normalizePath(path.resolve('node_modules/.vite-self'))
  let config = {
    root,
    cacheDir // 缓存目录，存放预编译后的文件和metadata.json
  };
  + const configFile = path.resolve(root, 'vite.config.js'); // 获取配置文件
  + // 判断配置文件是否存在
  + const exist = await fs.pathExists(configFile);
  + if (exist) {
  +  // 合并配置文件
  +  const userConfig = require(configFile);
  +  config = { ...config, ...userConfig }
  + }
  + const userPlugins = config.plugins || [];
  + const plugins = await resolvePlugins(config, userPlugins);
  config.plugins = plugins
  return config;
};

module.exports = resolveConfig;
```

- lib\plugins\index.js

```js{5,10}
const resolvePlugin = require('./resolve');
const importAnalysisPlugin = require('./importAnalysis');
const preAliasPlugin = require('./preAlias');
const definePlugin = require('./define');
+ const resolvePlugins = async (config, userPlugins) => {
  // 插件钩子的执行顺序是resolveId, load, transform,如果将用户钩子放在前面，可能会导致用户自定义插件的返回值使得后续的resolveId、load不能执行
  return [
    preAliasPlugin(config), // 这里必须放在resolvePlugin前面，因为和resolvePlugin插件监听的都是resolveId钩子，并且resolvePlugin插件的钩子能匹配所有的文件，会导致后续的resolveId钩子执行
    resolvePlugin(config),
    + ...userPlugins,
    definePlugin(config),
    importAnalysisPlugin(config)
  ]
}
exports.resolvePlugins = resolvePlugins
```

- lib\optimizer\esBuildScanPlugin.js

```js{4-12}
const esBuildScanPlugin = async (config, depImports) => {
  return {
    setup(build) {
    +  build.onResolve({ filter: /.vue$/ }, async ({ path, importer }) => {
    +    const resolved = await resolve(path, importer);
    +    if (resolved) {
    +      return {
    +        path: resolved.id || resolved,
    +        external: true,
    +      };
    +    }
    +  });
    }
  };
};
```

- lib\config.js

```js{5}
const normalizePath = (id) => {
  // 将路径中的\转换成/，统一路径
  return id.replace(/\\/g, "/");
};
const knowJsSrcRE = /.(js|vue)$/
// 匹配是否是Js请求
const isJSRequest = url => {
  return knowJsSrcRE.test(url)
}

exports.normalizePath = normalizePath;
exports.isJSRequest = isJSRequest;
```

### vue 插件

```js
const fs = require("fs");
const {
  parse,
  compileScript,
  compileTemplate,
  rewriteDefault,
  compileStyleAsync,
} = require("vue/compiler-sfc");
// 插件的核心目的：把vue文件的原始内容编译成JS内容返回
const vue = () => {
  return {
    name: "vue",
    config(config) {
      return {
        define: {
          __VUE_OPTIONS_API__: true,
          __VUE_PROD_DEVTOOLS__: false,
        },
      };
    },
    // id => /src/App.vue?vue&type=style&index=0&lang.css
    async load(id) {
      const { filename, query = "" } = parseVueRequest(id);
      if (query.has("vue")) {
        // 说明是vue组件的一部分
        const descriptor = await getDescriptor(filename);
        if (query.get("type") === "style") {
          const block = descriptor.styles[Number(query.get("index"))];
          if (block) {
            return { code: block.content };
          }
        }
      }
    },
    async transform(code, id) {
      // code: 此模块源代码， id： 绝对路径c:/xxx/App.vue
      const { filename, query } = parseVueRequest(id);
      // 第一次加载App.vue
      // 后面加载style
      if (filename.endsWith(".vue")) {
        if (query.get("type") === "style") {
          const descriptor = await getDescriptor(filename);
          let result = await transformStyle(
            code,
            descriptor,
            query.get("index")
          );
          return result;
        } else {
          let result = await transformMain(code, filename);
          return result;
        }
      }
      return null;
    },
  };
};

const transformStyle = async (code, descriptor, index) => {
  const block = descriptor.styles[index];
  const result = await compileStyleAsync({
    filename: descriptor.filename,
    source: code,
    id: `data-v-${descriptor.id}`,
    scoped: block.scoped,
  });
  let styleCode = result.code;
  const injectCode = [
    `let style = document.createElement('style');`,
    `style.innerHTML = ${JSON.stringify(styleCode)};`,
    `document.head.appendChild(style)`,
  ].join("\n");
  return {
    code: injectCode,
  };
};

// queryString = a=1&b=2
// let query = new URLSearchParams(queryString)
// query = { a: 1, b: 2 }
const parseVueRequest = (id) => {
  const [filename, queryString = ""] = id.split("?");
  const query = new URLSearchParams(queryString);
  return {
    filename,
    query,
  };
};

const transformMain = async (source, filename) => {
  const descriptor = await getDescriptor(filename);
  const scriptCode = genScriptCode(descriptor, filename);
  const styleCode = genStyleCode(descriptor, filename);
  const templateCode = genTemplateCode(descriptor, filename);
  const resolveCode = [
    styleCode,
    templateCode,
    scriptCode,
    `_sfs_main.render=render`,
    `export default _sfs_main`,
  ];
  return {
    code: resolveCode.join("\n"),
  };
};
const genScriptCode = (descriptor, filename) => {
  let scriptCode = "";
  // script =>export default { name: 'App' }
  const script = compileScript(descriptor, { id: filename });
  // scriptCode => const _sfs_main = { name: 'App' }
  scriptCode = rewriteDefault(script.content, "_sfs_main");
  return scriptCode;
};

const genStyleCode = (descriptor, filename) => {
  let styleCode = "";
  if (descriptor.styles.length) {
    descriptor.styles.forEach((style, index) => {
      const query = `?vue&type=style&index=${index}&lang.css`;
      const styleRequest = (filename + query).replace(/\\/g, "/");
      styleCode += `\nimport '${styleRequest}'`;
    });
    return styleCode;
  }
};
const genTemplateCode = (descriptor, filename) => {
  const content = descriptor.template.content;
  const result = compileTemplate({ source: content, id: filename });
  return result.code;
};
// 返回文件描述器
const getDescriptor = async (filename) => {
  const content = await fs.promises.readFile(filename, "utf8");
  const result = parse(content, { filename });
  // result => { descriptor: { filename: filename, template: '', script: '', template: ''} }
  let descriptor = result.descriptor;
  return descriptor;
};
module.exports = vue;
```

## 支持全局变量

- lib\plugins\index.js

```js{4,11}
const resolvePlugin = require('./resolve');
const importAnalysisPlugin = require('./importAnalysis');
const preAliasPlugin = require('./preAlias');
+ const definePlugin = require('./define');
const resolvePlugins = async (config, userPlugins) => {
  // 插件钩子的执行顺序是resolveId, load, transform,如果将用户钩子放在前面，可能会导致用户自定义插件的返回值使得后续的resolveId、load不能执行
  return [
    preAliasPlugin(config), // 这里必须放在resolvePlugin前面，因为和resolvePlugin插件监听的都是resolveId钩子，并且resolvePlugin插件的钩子能匹配所有的文件，会导致后续的resolveId钩子执行
    resolvePlugin(config),
    ...userPlugins,
    + definePlugin(config),
    importAnalysisPlugin(config)
  ]
}

exports.resolvePlugins = resolvePlugins
```

- lib\config.js

```js{23-28}
const path = require('path');
const fs = require('fs-extra');
const { resolvePlugins } = require('./plugins');
const { normalizePath } = require("./utils");

const resolveConfig = async () => {
  // root:当前命令执行所在的目录就是根目录
  const root = normalizePath(process.cwd());
  const cacheDir = normalizePath(path.resolve('node_modules/.vite-self'))
  let config = {
    root,
    cacheDir // 缓存目录，存放预编译后的文件和metadata.json
  };
  const configFile = path.resolve(root, 'vite.config.js'); // 获取配置文件
  // 判断配置文件是否存在
  const exist = await fs.pathExists(configFile);
  if (exist) {
    // 合并配置文件
    const userConfig = require(configFile);
    config = { ...config, ...userConfig }
  }
  const userPlugins = config.plugins || [];
  + for (const plugin of userPlugins) {
  +  if (plugin.config) {
  +    const res = await plugin.config(config)
  +    config = { ...config, ...res }
  +  }
  + }
  const plugins = await resolvePlugins(config, userPlugins);
  config.plugins = plugins
  return config;
};

module.exports = resolveConfig;

```

- lib\plugins\define.js

```js
const MagicString = require("magic-string");

const definePlugin = (config) => {
  return {
    name: "define",
    transform(code) {
      // 逻辑就是根据定义的变量然后转换代码时进行替换
      const replacements = config.define || {};
      const replacementKeys = Object.keys(replacements);
      const pattern = new RegExp("(" + replacementKeys.join("|") + ")", "g");
      const ms = new MagicString(code);
      let hasReplaced = false;
      let match;
      while ((match = pattern.exec(code))) {
        hasReplaced = true;
        const start = match.index; // 开始位置
        const end = start + match[0].length; // 结束位置
        const replacement = String(replacements[match[0]]);
        ms.overwrite(start, end, replacement);
      }
      if (!hasReplaced) return null;
      return {
        code: ms.toString(),
      };
    },
  };
};

module.exports = definePlugin;
```

- plugins\vue.js

```js{7-14}
const fs = require('fs')
const { parse, compileScript, compileTemplate, rewriteDefault, compileStyleAsync } = require('vue/compiler-sfc')
// 插件的核心目的：把vue文件的原始内容编译成JS内容返回
const vue = () => {
  return {
    name: 'vue',
    + config(config) {
    +  return {
    +    define: {
    +      __VUE_OPTIONS_API__: true,
    +      __VUE_PROD_DEVTOOLS__: false
    +    }
    +  }
    + },
    // id => /src/App.vue?vue&type=style&index=0&lang.css
    async load(id) {
      const { filename, query = '' } = parseVueRequest(id);
      if (query.has('vue')) { // 说明是vue组件的一部分
        const descriptor = await getDescriptor(filename);
        if (query.get('type') === 'style') {
          const block = descriptor.styles[Number(query.get('index'))];
          if (block) {
            return { code: block.content }
          }
        }
      }
    },
    async transform(code, id) {
      // code: 此模块源代码， id： 绝对路径c:/xxx/App.vue
      const { filename, query } = parseVueRequest(id);
      if (filename.endsWith('.vue')) {
        if (query.get('type') === 'style') {
          const descriptor = await getDescriptor(filename);
          let result = await transformStyle(code, descriptor, query.get('index'));
          return result
        } else {
          let result = await transformMain(code, filename);
          return result
        }
      }
      return null
    }
  }
}

const transformStyle = async (code, descriptor, index) => {
  const block = descriptor.styles[index];
  const result = await compileStyleAsync({
    filename: descriptor.filename,
    source: code,
    id: `data-v-${descriptor.id}`,
    scoped: block.scoped
  });
  let styleCode = result.code;
  const injectCode = [
    `let style = document.createElement('style');`,
    `style.innerHTML = ${JSON.stringify(styleCode)};`,
    `document.head.appendChild(style)`
  ].join('\n');
  return {
    code: injectCode
  }
}


// queryString = a=1&b=2
// let query = new URLSearchParams(queryString)
// query = { a: 1, b: 2 }
const parseVueRequest = (id) => {
  const [filename, queryString = ''] = id.split('?');
  const query = new URLSearchParams(queryString);
  return {
    filename,
    query
  }
}

const transformMain = async (source, filename) => {
  const descriptor = await getDescriptor(filename);
  const scriptCode = genScriptCode(descriptor, filename);
  const styleCode = genStyleCode(descriptor, filename);
  const templateCode = genTemplateCode(descriptor, filename);
  const resolveCode = [
    styleCode,
    templateCode,
    scriptCode,
    `_sfs_main.render=render`,
    `export default _sfs_main`
  ]
  return {
    code: resolveCode.join('\n')
  }
}
const genScriptCode = (descriptor, filename) => {
  let scriptCode = '';
  // script =>export default { name: 'App' }
  const script = compileScript(descriptor, { id: filename });
  // scriptCode => const _sfs_main = { name: 'App' }
  scriptCode = rewriteDefault(script.content, '_sfs_main');
  return scriptCode
}

const genStyleCode = (descriptor, filename) => {
  let styleCode = '';
  if (descriptor.styles.length) {
    descriptor.styles.forEach((style, index) => {
      const query = `?vue&type=style&index=${index}&lang.css`;
      const styleRequest = (filename + query).replace(/\\/g, '/');
      styleCode += `\nimport '${styleRequest}'`;
    })
    return styleCode
  }
}
const genTemplateCode = (descriptor, filename) => {
  const content = descriptor.template.content;
  const result = compileTemplate({ source: content, id: filename });
  return result.code
}
// 返回文件描述器
const getDescriptor = async (filename) => {
  const content = await fs.promises.readFile(filename, 'utf8');
  const result = parse(content, { filename });
  // result => { descriptor: { filename: filename, template: '', script: '', template: ''} }
  let descriptor = result.descriptor;
  return descriptor
}
module.exports = vue
```
