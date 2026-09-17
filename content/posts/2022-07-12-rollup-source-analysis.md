---
title: Rollup 源码阅读
date: 2022-07-12
category: 工程化
tags: [Rollup, 源码]
---

## 前置知识

### 初始化项目

```bash
npm install rollup magic-string acorn --save
```

### magic-string

- <a href="https://www.npmjs.com/package/magic-string" target="_blank">magic-string</a> 是一个操作字符串和生成 source-map 的工具库

```js
const MagicString = require("magic-string");
const sourceCode = `export const name = 'name'`;
const ms = new MagicString(sourceCode);
/**
 * snip(startIndex, endIndex): 截取
 * toString: 转成字符串
 * remove(startIndex, endIndex): 删除
 *
 * */
console.log(ms.snip(0, 6).toString()); // export
console.log(ms.remove(0, 7).toString()); // const name = 'name'

let bundle = new MagicString.Bundle();
bundle.addSource({
  content: "var a = 1;",
  separator: "\n",
});
bundle.addSource({
  content: "var b = 1;",
  separator: "\n",
});
console.log(bundle.toString()); // var a= 1; var b = 2
```

### AST

- 通过`JavaScript Parser`可以把代码转化为一颗抽象语法树 AST,这颗树定义了代码的结构，通过操纵这颗树，我们可以精准的定位到声明语句、赋值语句、运算语句等等，实现对代码的分析、优化、变更等操作

![AST](/images/notes/rollup/ast.jpg)

### AST 工作流

- Parse(解析) 将源代码转换成抽象语法树，树上有很多的 es tree 节点
- Transform(转换) 对抽象语法树进行转换
- Generate(代码生成) 将上一步经过转换过的抽象语法树生成新的代码

![AST-flow](/images/notes/rollup/ast-flow.jpg)

### acorn

- <a href="https://astexplorer.net/" target="_blank">ast explorer</a> 可以把代码转成语法树
- acorn 解析结果符合`The Es tree Spec`规范

![AST-tree](/images/notes/rollup/ast-tree.jpg)

**ast.js**

```js
const acorn = require("acorn");
const sourceCode = `import $ from 'jquery'`;
const ast = acorn.parse(sourceCode, {
  locations: true,
  ranges: true,
  sourceType: "module",
  ecmaVersion: 8,
});

let indent = 0;
const padding = () => " ".replace(indent);

const walk = (node, { enter, leave }) => {
  visit(node, null, enter, leave);
};
const visit = (node, parentNode, enter, leave) => {
  if (enter) {
    enter.call(null, node, parentNode);
  }

  const keys = Object.keys(node).filter((key) => typeof node[key] === "object");
  keys.forEach((key) => {
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach((val) => visit(val, node, enter, leave));
    } else if (value && value.type) {
      visit(value, node, enter, leave);
    }
  });

  if (leave) {
    leave.call(null, node, parentNode);
  }
};
// ast.body是一个AST语法树结构
ast.body.forEach((statement) => {
  walk(statement, {
    enter(node) {
      if (node.type) {
        console.log(padding() + node.type + "进入");
        indent += 2;
      }
    },
    leave(node) {
      if (node.type) {
        indent -= 2;
        console.log(padding() + node.type + "离开");
      }
    },
  });
});
```

![AST-es-tree](/images/notes/rollup/ast-es-tree.jpg)

```
ImportDeclaration进入
  ImportDefaultSpecifier进入
    Identifier进入
    Identifier离开
  ImportDefaultSpecifier离开
  Literal进入
  Literal离开
ImportDeclaration离开
```

### 作用域

- 作用域：在 JS 中，作用域是用来规定变量访问范围的规则

```js
function one() {
  var a = 1;
}
console.log(a);
```

- 作用域链：作用域链是由当前执行环境与上层执行环境的一系列变量对象组成的，它保证了当前执行环境对符合访问权限的变量和函数的有序访问

**scope.js**

```js
class Scope {
  constructor({ name = "", names = [], parent }) {
    this.name = name; // 作用域名称
    this.parent = parent; // 父作用域名称
    this.names = names; // 当前作用域内声明的变量
  }
  add(name) {
    // 向作用域内添加变量
    this.names.push(name);
  }
  findDefiningScope(name) {
    // 查找变量的作用域
    if (this.names.includes(name)) {
      return this;
    } else if (this.parent) {
      return this.parent.findDefiningScope(name);
    } else {
      return {};
    }
  }
}

let globalScope = new Scope({ name: "global", names: ["a"], parent: null });
let oneScope = new Scope({ name: "one", names: ["b"], parent: globalScope });
let twoScope = new Scope({ name: "two", names: ["c"], parent: oneScope });
console.log(globalScope.findDefiningScope("a").name); // globalScope
console.log(oneScope.findDefiningScope("b").name); // oneScope
console.log(twoScope.findDefiningScope("b").name); // oneScope
```

## 实现

### 打包功能

**debug.js**

```js
const path = require("path");
const rollup = require("./lib/rollup");
let entry = path.resolve(__dirname, "src/main.js");
rollup(entry, "bundle.js");
```

**lib/rollup.js**

```js
const Bundle = require("./Bundle");
function rollup(entry, filename) {
  const bundle = new Bundle({ entry });
  bundle.build(filename);
}
module.exports = rollup;
```

**lib/Bundle/index.js**

```js
const fs = require("fs");
const path = require("path");
const MagicString = require("magic-string");
const Module = require("../Module");
//打包工具，在打包的时候会生成一个Bundle实例，并收集其它模块，最后把所有代码打包在一起输出
class Bundle {
  constructor(options) {
    this.entryPath = options.entry; // 输入文件的路径 c:\xxx\src\main.js
  }
  build(filename) {
    // 1、打包编译
    let entryModule = this.fetchModule(this.entryPath);
    // 将语句展开
    this.statements = entryModule.expendAllStatements();
    const { code } = this.generator();
    // 2、输出到filename中
    fs.writeFileSync(filename, code);
  }
  fetchModule(importee) {
    const route = importee;
    if (route) {
      let code = fs.readFileSync(route, "utf8");
      const module = new Module({
        code,
        path: route,
        bundle: this,
      });
      return module;
    }
  }
  generator() {
    let bundle = new MagicString.Bundle();
    const source = statement._source.clone();
    this.statements.forEach((statement) => {
      bundle.addSource({
        content: source,
        separator: "\n",
      });
    });
    return { code: bundle.toString() };
  }
}

module.exports = Bundle;
```

**lib/Module/index.js**

```js
const MagicString = require("magic-string");
const { parse } = require("acorn");

class Module {
  constructor({ code, path, bundle }) {
    this.code = new MagicString(code);
    this.path = path; // 当前模块对应的绝对路径
    this.bundle = bundle; // 当前的Bundle,实际上只有一个
    this.ast = parse(code, {
      ecmaVersion: 8,
      sourceType: "module",
    });
  }
  expendAllStatements() {
    let allStatement = [];
    this.ast.body.forEach((statement) => {
      let statements = this.expandStatement(statement);
      allStatement.push(...statements);
    });
    return allStatement;
  }
  expandStatement(statement) {
    statement._source = this.code.snip(statement.start, statement.end); // 保存源代码
    statement._include = true;
    let result = [];
    result.push(statement);
    return result;
  }
}
module.exports = Module;
```

### 实现 tree-shaking

关于模块内的知识

```js
/*
  import {name as n, age} from './msg';
  var a = 'a'
  var b = 'b'
  function say(){
    console.log('say', name)
  }
  export {
    a,
    b as b1
  }
*/
// 导出变量 exports
let exports = {
  a: { localName: "a", exportName: "a" },
  b1: { localName: "b", exportName: "b1" },
};
// 导入变量 imports
let imports = {
  n: { importName: "name", source: "./msg" },
  age: { importName: "age", source: "./msg" },
};
// 定义变量 definitions
let definitions = {
  a: `var a = 'a'`,
  b: `var b = 'b'`,
  say: `function say(){console.log('say', name)}`,
};
```

**Bundle/index.js**

```js{19-39,54-57}
const fs = require("fs");
const path = require("path");
const MagicString = require("magic-string");
const Module = require("../Module");
//打包工具，在打包的时候会生成一个Bundle实例，并收集其它模块，最后把所有代码打包在一起输出
class Bundle {
  constructor(options) {
    this.entryPath = options.entry; // 输入文件的路径 c:\xxx\src\main.js
  }
  build(filename) {
    // 1、打包编译
    let entryModule = this.fetchModule(this.entryPath);
    // 将语句展开
    this.statements = entryModule.expendAllStatements();
    const { code } = this.generator();
    // 2、输出到filename中
    fs.writeFileSync(filename, code);
  }
  fetchModule(importee, importer) {
    /*
     * main.js
     * import { name } from './msg';
     * importee: ./msg 被导入方
     * importer: main  导入方
     */
    let route; // route必须是绝对路径
    if (!importer) {
      route = importee;
    } else {
      if (path.isAbsolute(importee)) {
        // 如果importee本身就是绝对路径
        route = importee;
      } else {
        route = path.resolve(
          path.dirname(importer),
          importee.replace(/\.js$/, "") + ".js"
        );
      }
    }
    if (route) {
      let code = fs.readFileSync(route, "utf8");
      const module = new Module({
        code,
        path: route,
        bundle: this,
      });
      return module;
    }
  }
  generator() {
    let bundle = new MagicString.Bundle();
    this.statements.forEach((statement) => {
      let source = statement._source.clone(); // 定义一个备份出来
      if (statement.type === "ExportNamedDeclaration") {
        // msg.js   export var name = 'name' 这种需要将export 截取掉
        source.remove(statement.start, statement.declaration.start);
      }
      bundle.addSource({
        content: source,
        separator: "\n",
      });
    });
    return { code: bundle.toString() };
  }
}

module.exports = Bundle;
```

**Module/index.js**

```js{3,15-21,23-61,67,76-82,86-111}
const MagicString = require("magic-string");
const { parse } = require("acorn");
const analyse = require("../ast/analyse");
const { hasOwnProperty } = require("../utils");
// 模块信息
class Module {
  constructor({ code, path, bundle }) {
    this.code = new MagicString(code);
    this.path = path; // 当前模块对应的绝对路径
    this.bundle = bundle; // 当前的Bundle,实际上只有一个
    this.ast = parse(code, {
      ecmaVersion: 8,
      sourceType: "module",
    });
    // imports和exports都是通过this.analysis方法设置的
    this.imports = {}; // 导入的变量
    this.exports = {}; // 导出的变量
    // definitions是通过analysis方法设置
    this.definitions = {}; // 模块变量对应的语句
    // 源码分析
    this.analysis();
  }
  analysis() {
    this.ast.body.forEach((statement) => {
      const { type } = statement;
      switch (type) {
        case "ImportDeclaration":
          // import { name, age as a } from "./msg";
          const source = statement.source.value; // ./msg
          statement.specifiers.forEach((specifier) => {
            let localName = specifier.local.name; // 对于 name => name age => a
            let importName = specifier.imported.name; // name => name  age => age
            this.imports[localName] = { importName, source };
          });
          break;
        case "ExportNamedDeclaration":
          const { declaration, specifiers } = statement;
          // export var name = 'name'  这种方式有declaration
          if (declaration && declaration.type === "VariableDeclaration") {
            declaration.declarations.forEach((declaration) => {
              let localName = declaration.id.name; // name
              let exportName = localName; // name
              this.exports[localName] = { localName, exportName };
            });
          } else if (specifiers) {
            /*var name = 'name'
            export { name as n }
            这种方式是specifiers
          */
            specifiers.forEach((specifier) => {
              let localName = specifier.local.name;
              let exportName = specifier.exported.name;
              this.exports[localName] = { localName, exportName };
            });
          }
          break;
        default:
          break;
      }
    });
    analyse(this.ast, this.code, this);
  }
  expendAllStatements() {
    let allStatement = [];
    this.ast.body.forEach((statement) => {
      // 如果是 import语句就直接跳过
      if (statement.type === "ImportDeclaration") return;
      let statements = this.expandStatement(statement);
      allStatement.push(...statements);
    });
    return allStatement;
  }
  expandStatement(statement) {
    statement._included = true;
    let result = []; // 输出语句数组
    // 获取当前语句依赖的变量 比如说 console.log(name), 那么在之前会把name这个变量添加到了console.log语句的_dependsOn上
    let _dependsOn = Object.keys(statement._dependsOn);
    _dependsOn.forEach((name) => {
      // 通过变量名找到变量定义的语句，语句是放在this(module)上的,添加到输出数组中
      let definitions = this.define(name);
      result.push(...definitions);
    });
    result.push(statement);
    return result;
  }
  define(name) {
    // 先判断当前变量是模块内部的还是通过import导入进来的
    if (hasOwnProperty(this.imports, name)) {
      /** main.js
       * import { name } from './msg'
       **/
      // 根据当前模块中的名称获取来源以及导入的名称
      const { source, importName } = this.imports[name];
      // 通过当前文件路径和来源找到导入的模块
      let importModule = this.bundle.fetchModule(source, this.path); // msg模块
      // 通过导入的名称在导入模块中查找变量名
      const { localName } = importModule.exports[importName];
      // 通过变量名找到变量语句
      return importModule.define(localName);
    } else {
      // 如果是当前模块内定义
      // 直接就在当前module的definitions中找到定义语句
      let statement = this.definitions[name];
      if (statement && !statement._included) {
        //如果本地变量的话还需要继续展开
        return this.expandStatement(statement);
      } else {
        return [];
      }
    }
  }
}
module.exports = Module;
```

**ast/ayalyse.js**

```js
const walk = require("./walk");
const Scope = require("./scope");
const { hasOwnProperty } = require("../utils");
/**
 *
 * @param {*} ast 模块的语法树
 * @param {*} code 模块源代码
 * @param {*} module 模块
 */
function analyse(ast, code, module) {
  let currentScope = new Scope({ name: "全局作用域", parent: null, names: [] });
  // 第一次循环：创建作用域链，为了知道在此模块中声明了那些变量，同时记录这个变量的节点
  ast.body.forEach((statement) => {
    // statement都是顶层的节点语句
    // 给作用域内添加变量
    function addToScope(name) {
      currentScope.add(name); // 把name变量放到作用域内
      if (!currentScope.parent) {
        // 如果没有父作用域，说明是顶层作用域
        statement._defines[name] = true;
      }
    }
    Object.defineProperties(statement, {
      _source: { value: code.snip(statement.start, statement.end) }, // 保存源代码
      _defines: { value: {} }, // 此节点定义的变量
      _dependsOn: { value: {} }, // 此节点读取了那些变量
    });
    walk(statement, {
      enter(node) {
        let newScope;
        switch (node.type) {
          case "VariableDeclaration": // var sex = 'sex'
            node.declarations.forEach((declaration) => {
              addToScope(declaration.id.name);
            });
            break;
          case "FunctionDeclaration": // function say(){}
            addToScope(node.id.name); // 把say添加到作用域内
            // 函数声明会创建作用域构建作用域链
            // 函数的形参也是函数作用域内的变量
            const names = node.params.map((param) => param.name);
            newScope = new Scope({
              name: node.id.name,
              parent: currentScope,
              names,
            });
            break;
          default:
            break;
        }
        if (newScope) {
          // 说明当前节点创建了新的作用域
          Object.defineProperty(statement, "_scope", { value: newScope });
          currentScope = newScope;
        }
      },
      leave(node) {
        if (hasOwnProperty(node, "_scope")) {
          currentScope = currentScope.parent;
        }
      },
    });
  });

  // 第二次循环：为了找出模块内使用依赖的变量
  ast.body.forEach((statement) => {
    walk(statement, {
      enter(node) {
        if (node.type === "Identifier") {
          // 使用变量的时候，节点类型
          const name = node.name;
          statement._dependsOn[name] = true; // 此节点使用的变量
        }
      },
    });
  });
  // 第三次循环：在模块内保存使用变量的节点
  ast.body.forEach((statement) => {
    Object.keys(statement._defines).forEach((name) => {
      module.definitions[name] = statement;
    });
  });
}

module.exports = analyse;
```

**utils.js**

```js
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

exports.hasOwnProperty = hasOwnProperty;
```

### 包含修改语句

- 给每个模块添加一个`modifications`属性，用来保存变量对应的修改语句
- 通过`analyse`分析节点的时候
  - 第一次循环给节点添加一个`_modifies`属性记录当前节点修改的属性
  - 在第二次循环(找到节点中使用的变量)，新增找出每个节点修改的属性功能
  - 第三次循环：在模块内保存使用变量节点的同时保存修改变量的节点
- 在模块调用`expandStatement`展开节点的时候,先根据节点定义的变量，再根据变量找节点修改这个变量的几点

**src/msg.js**

```js
export var age = 12;
age += 3;
age++;
export var name = "test";
```

**Module/index.js**

```js{20,85-98}
const MagicString = require("magic-string");
const { parse } = require("acorn");
const analyse = require("../ast/analyse");
const { hasOwnProperty } = require("../utils");
// 模块信息
class Module {
  constructor({ code, path, bundle }) {
    this.code = new MagicString(code);
    this.path = path; // 当前模块对应的绝对路径
    this.bundle = bundle; // 当前的Bundle,实际上只有一个
    this.ast = parse(code, {
      ecmaVersion: 8,
      sourceType: "module",
    });
    // imports和exports都是通过this.analysis方法设置的
    this.imports = {}; // 导入的变量
    this.exports = {}; // 导出的变量
    // definitions是通过analysis方法设置
    this.definitions = {}; // 模块变量对应的语句
    this.modifications = {}; // 存放变量对应的修改语句 {age: ['age += 2']}
    // 源码分析
    this.analysis();
  }
  analysis() {
    this.ast.body.forEach((statement) => {
      const { type } = statement;
      switch (type) {
        case "ImportDeclaration":
          // import { name, age as a } from "./msg";
          const source = statement.source.value; // ./msg
          statement.specifiers.forEach((specifier) => {
            let localName = specifier.local.name; // 对于 name => name age => a
            let importName = specifier.imported.name; // name => name  age => age
            this.imports[localName] = { importName, source };
          });
          break;
        case "ExportNamedDeclaration":
          const { declaration, specifiers } = statement;
          // export var name = 'name'  这种方式有declaration
          if (declaration && declaration.type === "VariableDeclaration") {
            declaration.declarations.forEach((declaration) => {
              let localName = declaration.id.name; // name
              let exportName = localName; // name
              this.exports[localName] = { localName, exportName };
            });
          } else if (specifiers) {
            /*var name = 'name'
            export { name as n }
            这种方式是specifiers
          */
            specifiers.forEach((specifier) => {
              let localName = specifier.local.name;
              let exportName = specifier.exported.name;
              this.exports[localName] = { localName, exportName };
            });
          }
          break;
        default:
          break;
      }
    });
    analyse(this.ast, this.code, this);
  }
  expendAllStatements() {
    let allStatement = [];
    this.ast.body.forEach((statement) => {
      // 如果是 import语句就直接跳过
      if (statement.type === "ImportDeclaration") return;
      let statements = this.expandStatement(statement);
      allStatement.push(...statements);
    });
    return allStatement;
  }
  expandStatement(statement) {
    statement._included = true;
    let result = []; // 输出语句数组
    // 获取当前语句依赖的变量 比如说 console.log(name), 那么在之前会把name这个变量添加到了console.log语句的_dependsOn上
    let _dependsOn = Object.keys(statement._dependsOn);
    _dependsOn.forEach((name) => {
      // 通过变量名找到变量定义的语句，语句是放在this(module)上的,添加到输出数组中
      let definitions = this.define(name);
      result.push(...definitions);
    });
    result.push(statement);
    // 需要先找到定义的变量，然后再去找对应变量的修改语句
    const defines = Object.keys(statement._defines);
    defines.forEach((name) => {
      const modifications =
        hasOwnProperty(this.modifications, name) && this.modifications[name];
      if (modifications) {
        modifications.forEach((statement) => {
          if (!statement._included) {
            let statements = this.expandStatement(statement);
            result.push(...statements);
          }
        });
      }
    });
    return result;
  }
  define(name) {
    // 先判断当前变量是模块内部的还是通过import导入进来的
    if (hasOwnProperty(this.imports, name)) {
      /** main.js
       * import { name } from './msg'
       **/
      // 根据当前模块中的名称获取来源以及导入的名称
      const { source, importName } = this.imports[name];
      // 通过当前文件路径和来源找到导入的模块
      let importModule = this.bundle.fetchModule(source, this.path); // msg模块
      // 通过导入的名称在导入模块中查找变量名
      const { localName } = importModule.exports[importName];
      // 通过变量名找到变量语句
      return importModule.define(localName);
    } else {
      // 如果是当前模块内定义
      // 直接就在当前module的definitions中找到定义语句
      let statement = this.definitions[name];
      if (statement && !statement._included) {
        //如果本地变量的话还需要继续展开
        return this.expandStatement(statement);
      } else {
        return [];
      }
    }
  }
}
module.exports = Module;
```

**ast/analyse.js**

```js{27,68-97,106-111}
const walk = require("./walk");
const Scope = require("./scope");
const { hasOwnProperty } = require("../utils");
/**
 *
 * @param {*} ast 模块的语法树
 * @param {*} code 模块源代码
 * @param {*} module 模块
 */
function analyse(ast, code, module) {
  let currentScope = new Scope({ name: "全局作用域", parent: null, names: [] });
  // 第一次循环：创建作用域链，为了知道在此模块中声明了那些变量，同时记录这个变量的节点
  ast.body.forEach((statement) => {
    // statement都是顶层的节点语句
    // 给作用域内添加变量
    function addToScope(name) {
      currentScope.add(name); // 把name变量放到作用域内
      if (!currentScope.parent) {
        // 如果没有父作用域，说明是顶层作用域
        statement._defines[name] = true;
      }
    }
    Object.defineProperties(statement, {
      _source: { value: code.snip(statement.start, statement.end) }, // 保存源代码
      _defines: { value: {} }, // 此节点定义的变量
      _dependsOn: { value: {} }, // 此节点读取了那些变量
      _modifies: { value: {} }, // 此节点修改了哪些变量
    });
    walk(statement, {
      enter(node) {
        let newScope;
        switch (node.type) {
          case "VariableDeclaration": // var sex = 'sex'
            node.declarations.forEach((declaration) => {
              addToScope(declaration.id.name);
            });
            break;
          case "FunctionDeclaration": // function say(){}
            addToScope(node.id.name); // 把say添加到作用域内
            // 函数声明会创建作用域构建作用域链
            // 函数的形参也是函数作用域内的变量
            const names = node.params.map((param) => param.name);
            newScope = new Scope({
              name: node.id.name,
              parent: currentScope,
              names,
            });
            break;
          default:
            break;
        }
        if (newScope) {
          // 说明当前节点创建了新的作用域
          Object.defineProperty(statement, "_scope", { value: newScope });
          currentScope = newScope;
        }
      },
      leave(node) {
        if (hasOwnProperty(node, "_scope")) {
          currentScope = currentScope.parent;
        }
      },
    });
  });

  // 第二次循环：为了找出模块内使用使用、修改的变量
  ast.body.forEach((statement) => {
    function checkForReads(node) { // 读取使用的变量
      if (node.type === 'Identifier') { // 使用变量的时候，节点类型
        const name = node.name;
        statement._dependsOn[name] = true // 此节点使用的变量
      }
    }
    function addNode(name) {
      statement._modifies[name] = true;
    }
    function checkForWrites(node) { // 读取修改的变量
      if (node.type === 'AssignmentExpression') { // age = 12
        addNode(node.left.name)
      } else if (node.type === 'UpdateExpression') { // age ++
        addNode(node.argument.name)
      }
    }
    walk(statement, {
      enter(node) {
        if (hasOwnProperty(node, '_scope')) {
          currentScope = node._scope
        }
        checkForReads(node)
        checkForWrites(node)
      },
      leave(node) {
        if (hasOwnProperty(node, '_scope')) {
          currentScope = currentScope.parent
        }
      }
    });
  });
  // 第三次循环：
  ast.body.forEach((statement) => {
    // 在模块内保存使用变量的的节点
    Object.keys(statement._defines).forEach((name) => {
      module.definitions[name] = statement;
    });
    // 在模块内保存修改变量的的节点
    Object.keys(statement._modifies).forEach((name) => {
      if (!module.modifications[name]) {
        module.modifications[name] = [];
      }
      module.modifications[name].push(statement);
    });
  });
}

module.exports = analyse;
```

### 支持块级作用域

- `Scope`需要添加块级作用域标识`isBlock`
- 作用域的`add`方法需要判断是向当前作用域添加还是向父级作用域添加变量
- `analyse`分析语句的时候，在第一循环创建作用域链的时候需要判断是否是块级作用域

**main.js**

```js
if (true) {
  // 会形成块级作用域
  var a = "a"; // 向上级作用域添加
  let b = "b"; // 自己添加
  const c = "c"; // 自己添加
}
console.log(a);
```

**Scope.js**

```js{2,6,11-16}
class Scope {
  constructor({ name = "", names = [], parent, isBlock }) {
    this.name = name; // 作用域名称
    this.parent = parent; // 父作用域名称
    this.names = names; // 当前作用域内声明的变量
    this.isBlock = !!isBlock; // 是否是块级作用域
  }
  add(name, isBlockDeclaration) {
    // 向作用域内添加变量
    // 如果是块级作用域并且变量不是块级作用域声明需要向父级作用域添加变量
    // if(true){ let a = 1; var b = 2} 这种的话a就放在自己作用域中，b需要放到父级中
    if (this.isBlock && !isBlockDeclaration) {
      this.parent.add(name);
    } else {
      this.names.push(name);
    }
  }
  findDefiningScope(name) {
    // 查找变量的作用域
    if (this.names.includes(name)) {
      return this;
    } else if (this.parent) {
      return this.parent.findDefiningScope(name);
    } else {
      return {};
    }
  }
}

module.exports = Scope;
```

**analyse.js**

```js{16-25,38-40,54-56}
const walk = require("./walk");
const Scope = require("./scope");
const { hasOwnProperty } = require("../utils");
/**
 *
 * @param {*} ast 模块的语法树
 * @param {*} code 模块源代码
 * @param {*} module 模块
 */
function analyse(ast, code, module) {
  let currentScope = new Scope({ name: "全局作用域", parent: null, names: [] });
  // 第一次循环：创建作用域链，为了知道在此模块中声明了那些变量，同时记录这个变量的节点
  ast.body.forEach((statement) => {
    // statement都是顶层的节点语句
    // 给作用域内添加变量
    function addToScope(name, isBlockDeclaration) {
      currentScope.add(name, isBlockDeclaration); // 把name变量放到作用域内
      // 如果没有父作用域(说明是顶层作用域)，并且当前作用域是块级作用域都需要放到自己身上
      if (
        !currentScope.parent ||
        (currentScope.isBlock && !isBlockDeclaration)
      ) {
        statement._defines[name] = true;
      }
    }
    Object.defineProperties(statement, {
      _source: { value: code.snip(statement.start, statement.end) }, // 保存源代码
      _defines: { value: {} }, // 此节点定义的变量
      _dependsOn: { value: {} }, // 此节点读取了那些变量
      _modifies: { value: {} }, // 此节点修改了哪些变量
    });
    walk(statement, {
      enter(node) {
        let newScope;
        switch (node.type) {
          case "VariableDeclaration": // var sex = 'sex'
            node.declarations.forEach((declaration) => {
              // 需要判断是否是块级声明
              let isBlock = node.kind === "let" || node.kind === "const";
              addToScope(declaration.id.name, isBlock);
            });
            break;
          case "FunctionDeclaration": // function say(){}
            addToScope(node.id.name); // 把say添加到作用域内
            // 函数声明会创建作用域构建作用域链
            // 函数的形参也是函数作用域内的变量
            const names = node.params.map((param) => param.name);
            newScope = new Scope({
              name: node.id.name,
              parent: currentScope,
              names,
            });
            break;
          case "BlockStatement": // 块级作用域
            newScope = new Scope({ parent: currentScope, isBlock: true });
            break;
          default:
            break;
        }
        if (newScope) {
          // 说明当前节点创建了新的作用域
          Object.defineProperty(statement, "_scope", { value: newScope });
          currentScope = newScope;
        }
      },
      leave(node) {
        if (hasOwnProperty(node, "_scope")) {
          currentScope = currentScope.parent;
        }
      },
    });
  });
  // 第二次循环：为了找出模块内使用依赖、修改的变量
  ast.body.forEach((statement) => {
    function addNode(name) {
      statement._modifies[name] = true;
    }
    function checkForReads(node) {
      if (node.type === "Identifier") {
        // 使用变量的时候，节点类型
        const name = node.name;
        statement._dependsOn[name] = true; // 此节点使用的变量
      }
    }
    function checkForWrites(node) {
      if (node.type === "AssignmentExpression") {
        // age = 12
        addNode(node.left.name);
      } else if (node.type === "UpdateExpression") {
        // age ++
        addNode(node.argument.name);
      }
    }
    walk(statement, {
      enter(node) {
        if (hasOwnProperty(node, "_scope")) {
          currentScope = node._scope;
        }
        checkForReads(node);
        checkForWrites(node);
      },
      leave(node) {
        if (hasOwnProperty(node, "_scope")) {
          currentScope = currentScope.parent;
        }
      },
    });
  });
  // 第三次循环：
  ast.body.forEach((statement) => {
    // 在模块内保存使用变量的的节点
    Object.keys(statement._defines).forEach((name) => {
      module.definitions[name] = statement;
    });
    // 在模块内保存修改变量的的节点
    Object.keys(statement._modifies).forEach((name) => {
      if (!module.modifications[name]) {
        module.modifications[name] = [];
      }
      module.modifications[name].push(statement);
    });
  });
}

module.exports = analyse;
```

### 支持入口 tree-shaking

- 在展开语句的时候，如果是`变量声明`就直接跳过

**main.js**

```js
var name = "test";
var age = 12;
console.log(age);
```

**bundle.js**

```js
var age = 12;
console.log(age);
```

**Module/index.js**

```js{5,70-71,119-133}
const MagicString = require("magic-string");
const { parse } = require("acorn");
const analyse = require("../ast/analyse");
const { hasOwnProperty } = require("../utils");
const SYSTEM_VARIABLE = ["console", "log"]; // 系统变量
// 模块信息
class Module {
  constructor({ code, path, bundle }) {
    this.code = new MagicString(code);
    this.path = path; // 当前模块对应的绝对路径
    this.bundle = bundle; // 当前的Bundle,实际上只有一个
    this.ast = parse(code, {
      ecmaVersion: 8,
      sourceType: "module",
    });
    // imports和exports都是通过this.analysis方法设置的
    this.imports = {}; // 导入的变量
    this.exports = {}; // 导出的变量
    // definitions是通过analysis方法设置
    this.definitions = {}; // 模块变量对应的语句
    this.modifications = {}; // 存放变量对应的修改语句 {age: ['age += 2']}
    // 源码分析
    this.analysis();
  }
  analysis() {
    this.ast.body.forEach((statement) => {
      const { type } = statement;
      switch (type) {
        case "ImportDeclaration":
          // import { name, age as a } from "./msg";
          const source = statement.source.value; // ./msg
          statement.specifiers.forEach((specifier) => {
            let localName = specifier.local.name; // 对于 name => name age => a
            let importName = specifier.imported.name; // name => name  age => age
            this.imports[localName] = { importName, source };
          });
          break;
        case "ExportNamedDeclaration":
          const { declaration, specifiers } = statement;
          // export var name = 'name'  这种方式有declaration
          if (declaration && declaration.type === "VariableDeclaration") {
            declaration.declarations.forEach((declaration) => {
              let localName = declaration.id.name; // name
              let exportName = localName; // name
              this.exports[localName] = { localName, exportName };
            });
          } else if (specifiers) {
            /*var name = 'name'
            export { name as n }
            这种方式是specifiers
          */
            specifiers.forEach((specifier) => {
              let localName = specifier.local.name;
              let exportName = specifier.exported.name;
              this.exports[localName] = { localName, exportName };
            });
          }
          break;
        default:
          break;
      }
    });
    analyse(this.ast, this.code, this);
  }
  expendAllStatements() {
    let allStatement = [];
    this.ast.body.forEach((statement) => {
      // 如果是 import语句就直接跳过
      if (statement.type === "ImportDeclaration") return;
      // 如果是变量声明，也直接跳过，通过展开来获取
      if (statement.type === "VariableDeclaration") return;
      let statements = this.expandStatement(statement);
      allStatement.push(...statements);
    });
    return allStatement;
  }
  expandStatement(statement) {
    statement._included = true;
    let result = []; // 输出语句数组
    // 获取当前语句依赖的变量 比如说 console.log(name), 那么在之前会把name这个变量添加到了console.log语句的_dependsOn上
    let _dependsOn = Object.keys(statement._dependsOn);
    _dependsOn.forEach((name) => {
      // 通过变量名找到变量定义的语句，语句是放在this(module)上的,添加到输出数组中
      let definitions = this.define(name);
      result.push(...definitions);
    });
    result.push(statement);
    // 需要先找到定义的变量，然后再去找对应变量的修改语句
    const defines = Object.keys(statement._defines);
    defines.forEach((name) => {
      const modifications =
        hasOwnProperty(this.modifications, name) && this.modifications[name];
      if (modifications) {
        modifications.forEach((statement) => {
          if (!statement._included) {
            let statements = this.expandStatement(statement);
            result.push(...statements);
          }
        });
      }
    });
    return result;
  }
  define(name) {
    // 先判断当前变量是模块内部的还是通过import导入进来的
    if (hasOwnProperty(this.imports, name)) {
      /** main.js
       * import { name } from './msg'
       **/
      // 根据当前模块中的名称获取来源以及导入的名称
      const { source, importName } = this.imports[name];
      // 通过当前文件路径和来源找到导入的模块
      let importModule = this.bundle.fetchModule(source, this.path); // msg模块
      // 通过导入的名称在导入模块中查找变量名
      const { localName } = importModule.exports[importName];
      // 通过变量名找到变量语句
      return importModule.define(localName);
    } else {
      // 如果是当前模块内定义
      // 直接就在当前module的definitions中找到定义语句
      let statement = this.definitions[name];
      if (statement) {
        if (statement._included) return [];
        // 如果本地变量的话还需要继续展开
        return this.expandStatement(statement);
      } else if (SYSTEM_VARIABLE.includes(name)) {
        // 如果是系统变量
        return [];
      } else {
        throw new Error(
          `变量${name}没有既没有从外部导入，也没有在当前模块内声明！`
        );
      }
    }
  }
}
module.exports = Module;
```

### 变量重命名

- 在入口模块中展开所有语句后需要解决变量重命名问题
  - 在每个模块分析的时候为模块中的语句添加`_module`标识记录语句所属的模块
  - 入口模块中，遍历所有语句，同时记录`定义的变量的模块`以及`冲突的变量`
  - 遍历冲突变量，在模块中修改变量名
- 在生成代码的时候去重命名

**main.js**

```js
/*
  age1.js
  const age = 1;
  export const age2 = age+'1';

  age2.js
  const age = 1
  export const age1 = age + '2'

  age3.js
  const age = 1
  export const age1 = age + '3'
*/
import { age1 } from "./age1";
import { age2 } from "./age2";
import { age3 } from "./age3";
console.log(age1, age2, age3);
```

**Module/index.js**

```js{22,137-142}
const MagicString = require("magic-string");
const { parse } = require("acorn");
const analyse = require("../ast/analyse");
const { hasOwnProperty } = require("../utils");
const SYSTEM_VARIABLE = ["console", "log"]; // 系统变量
// 模块信息
class Module {
  constructor({ code, path, bundle }) {
    this.code = new MagicString(code);
    this.path = path; // 当前模块对应的绝对路径
    this.bundle = bundle; // 当前的Bundle,实际上只有一个
    this.ast = parse(code, {
      ecmaVersion: 8,
      sourceType: "module",
    });
    // imports和exports都是通过this.analysis方法设置的
    this.imports = {}; // 导入的变量
    this.exports = {}; // 导出的变量
    // definitions是通过analysis方法设置
    this.definitions = {}; // 模块变量对应的语句
    this.modifications = {}; // 存放变量对应的修改语句 {age: ['age += 2']}
    this.canonicalName = {}; // 保存冲突变量重命名前后{name: name$1}
    // 源码分析
    this.analysis();
  }
  analysis() {
    this.ast.body.forEach((statement) => {
      const { type } = statement;
      switch (type) {
        case "ImportDeclaration":
          // import { name, age as a } from "./msg";
          const source = statement.source.value; // ./msg
          statement.specifiers.forEach((specifier) => {
            let localName = specifier.local.name; // 对于 name => name age => a
            let importName = specifier.imported.name; // name => name  age => age
            this.imports[localName] = { importName, source };
          });
          break;
        case "ExportNamedDeclaration":
          const { declaration, specifiers } = statement;
          // export var name = 'name'  这种方式有declaration
          if (declaration && declaration.type === "VariableDeclaration") {
            declaration.declarations.forEach((declaration) => {
              let localName = declaration.id.name; // name
              let exportName = localName; // name
              this.exports[localName] = { localName, exportName };
            });
          } else if (specifiers) {
            /*var name = 'name'
            export { name as n }
            这种方式是specifiers
          */
            specifiers.forEach((specifier) => {
              let localName = specifier.local.name;
              let exportName = specifier.exported.name;
              this.exports[localName] = { localName, exportName };
            });
          }
          break;
        default:
          break;
      }
    });
    analyse(this.ast, this.code, this);
  }
  expendAllStatements() {
    let allStatement = [];
    this.ast.body.forEach((statement) => {
      // 如果是 import语句就直接跳过
      if (statement.type === "ImportDeclaration") return;
      // 如果是变量声明，也直接跳过，通过展开来获取
      if (statement.type === "VariableDeclaration") return;
      let statements = this.expandStatement(statement);
      allStatement.push(...statements);
    });
    return allStatement;
  }
  expandStatement(statement) {
    statement._included = true;
    let result = []; // 输出语句数组
    // 获取当前语句依赖的变量 比如说 console.log(name), 那么在之前会把name这个变量添加到了console.log语句的_dependsOn上
    let _dependsOn = Object.keys(statement._dependsOn);
    _dependsOn.forEach((name) => {
      // 通过变量名找到变量定义的语句，语句是放在this(module)上的,添加到输出数组中
      let definitions = this.define(name);
      result.push(...definitions);
    });
    result.push(statement);
    // 需要先找到定义的变量，然后再去找对应变量的修改语句
    const defines = Object.keys(statement._defines);
    defines.forEach((name) => {
      const modifications =
        hasOwnProperty(this.modifications, name) && this.modifications[name];
      if (modifications) {
        modifications.forEach((statement) => {
          if (!statement._included) {
            let statements = this.expandStatement(statement);
            result.push(...statements);
          }
        });
      }
    });
    return result;
  }
  define(name) {
    // 先判断当前变量是模块内部的还是通过import导入进来的
    if (hasOwnProperty(this.imports, name)) {
      /** main.js
       * import { name } from './msg'
       **/
      // 根据当前模块中的名称获取来源以及导入的名称
      const { source, importName } = this.imports[name];
      // 通过当前文件路径和来源找到导入的模块
      let importModule = this.bundle.fetchModule(source, this.path); // msg模块
      // 通过导入的名称在导入模块中查找变量名
      const { localName } = importModule.exports[importName];
      // 通过变量名找到变量语句
      return importModule.define(localName);
    } else {
      // 如果是当前模块内定义
      // 直接就在当前module的definitions中找到定义语句
      let statement = this.definitions[name];
      if (statement) {
        if (statement._included) return [];
        // 如果本地变量的话还需要继续展开
        return this.expandStatement(statement);
      } else if (SYSTEM_VARIABLE.includes(name)) {
        // 如果是系统变量
        return [];
      } else {
        throw new Error(
          `变量${name}没有既没有从外部导入，也没有在当前模块内声明！`
        );
      }
    }
  }
  rename(name, replacement) {
    this.canonicalName[name] = replacement;
  }
  getCanonicalName(name) {
    return this.canonicalName[name] || name;
  }
}
module.exports = Module;
```

**ast/analyse.js**

```js{31}
const walk = require("./walk");
const Scope = require("./scope");
const { hasOwnProperty } = require("../utils");
/**
 *
 * @param {*} ast 模块的语法树
 * @param {*} code 模块源代码
 * @param {*} module 模块
 */
function analyse(ast, code, module) {
  let currentScope = new Scope({ name: "全局作用域", parent: null, names: [] });
  // 第一次循环：创建作用域链，为了知道在此模块中声明了那些变量，同时记录这个变量的节点
  ast.body.forEach((statement) => {
    // statement都是顶层的节点语句
    // 给作用域内添加变量
    function addToScope(name, isBlockDeclaration) {
      currentScope.add(name, isBlockDeclaration); // 把name变量放到作用域内
      // 如果没有父作用域(说明是顶层作用域)，并且当前作用域是块级作用域都需要放到自己身上
      if (
        !currentScope.parent ||
        (currentScope.isBlock && !isBlockDeclaration)
      ) {
        statement._defines[name] = true;
      }
    }
    Object.defineProperties(statement, {
      _source: { value: code.snip(statement.start, statement.end) }, // 保存源代码
      _defines: { value: {} }, // 此节点定义的变量
      _dependsOn: { value: {} }, // 此节点读取了那些变量
      _modifies: { value: {} }, // 此节点修改了哪些变量
      _module: { value: module }, // 保存节点对应的模块
    });
    walk(statement, {
      enter(node) {
        let newScope;
        switch (node.type) {
          case "VariableDeclaration": // var sex = 'sex'
            node.declarations.forEach((declaration) => {
              // 需要判断是否是块级声明
              let isBlock = node.kind === "let" || node.kind === "const";
              addToScope(declaration.id.name, isBlock);
            });
            break;
          case "FunctionDeclaration": // function say(){}
            addToScope(node.id.name); // 把say添加到作用域内
            // 函数声明会创建作用域构建作用域链
            // 函数的形参也是函数作用域内的变量
            const names = node.params.map((param) => param.name);
            newScope = new Scope({
              name: node.id.name,
              parent: currentScope,
              names,
            });
            break;
          case "BlockStatement": // 块级作用域
            newScope = new Scope({ parent: currentScope, isBlock: true });
            break;
          default:
            break;
        }
        if (newScope) {
          // 说明当前节点创建了新的作用域
          Object.defineProperty(statement, "_scope", { value: newScope });
          currentScope = newScope;
        }
      },
      leave(node) {
        if (hasOwnProperty(node, "_scope")) {
          currentScope = currentScope.parent;
        }
      },
    });
  });
  // 第二次循环：为了找出模块内使用依赖、修改的变量
  ast.body.forEach((statement) => {
    function addNode(name) {
      statement._modifies[name] = true;
    }
    function checkForReads(node) {
      if (node.type === "Identifier") {
        // 使用变量的时候，节点类型
        const name = node.name;
        statement._dependsOn[name] = true; // 此节点使用的变量
      }
    }
    function checkForWrites(node) {
      if (node.type === "AssignmentExpression") {
        // age = 12
        addNode(node.left.name);
      } else if (node.type === "UpdateExpression") {
        // age ++
        addNode(node.argument.name);
      }
    }
    walk(statement, {
      enter(node) {
        if (hasOwnProperty(node, "_scope")) {
          currentScope = node._scope;
        }
        checkForReads(node);
        checkForWrites(node);
      },
      leave(node) {
        if (hasOwnProperty(node, "_scope")) {
          currentScope = currentScope.parent;
        }
      },
    });
  });
  // 第三次循环：
  ast.body.forEach((statement) => {
    // 在模块内保存使用变量的的节点
    Object.keys(statement._defines).forEach((name) => {
      module.definitions[name] = statement;
    });
    // 在模块内保存修改变量的的节点
    Object.keys(statement._modifies).forEach((name) => {
      if (!module.modifications[name]) {
        module.modifications[name] = [];
      }
      module.modifications[name].push(statement);
    });
  });
}

module.exports = analyse;
```

**Bundle/index.js**

```js{5,16,21-43,78-86,92}
const fs = require("fs");
const path = require("path");
const MagicString = require("magic-string");
const Module = require("../Module");
const { hasOwnProperty, replaceIdentifiers } = require("../utils");
//打包工具，在打包的时候会生成一个Bundle实例，并收集其它模块，最后把所有代码打包在一起输出
class Bundle {
  constructor(options) {
    this.entryPath = options.entry; // 输入文件的路径 c:\xxx\src\main.js
  }
  build(filename) {
    // 1、打包编译
    let entryModule = this.fetchModule(this.entryPath);
    // 将语句展开
    this.statements = entryModule.expendAllStatements();
    this.deconflict(); // 解决变量冲突问题
    const { code } = this.generator();
    // 2、输出到filename中
    fs.writeFileSync(filename, code);
  }
  deconflict() {
    const defines = {}; // 定义的变量对应的模块
    const conflicts = {}; // 冲突的变量
    this.statements.forEach((statement) => {
      Object.keys(statement._defines).forEach((name) => {
        if (hasOwnProperty(defines, name)) {
          // 如果已经定义过了，表示冲突了
          conflicts[name] = true;
        } else {
          defines[name] = []; //
        }
        defines[name].push(statement._module);
      });
    });
    Object.keys(conflicts).forEach((name) => {
      const modules = defines[name]; // 找到冲突变量对应的所有模块
      modules.pop(); // 所有模块中最后一个模块不需要重命名
      modules.forEach((module, index) => {
        const replacement = `${name}$${modules.length - index}`; // 重命名的名称
        module.rename(name, replacement);
      });
    });
  }
  fetchModule(importee, importer) {
    /*
     * main.js
     * import { name } from './msg';
     * importee: ./msg 被导入方
     * importer: main  导入方
     */
    let route; // route必须是绝对路径
    if (!importer) {
      route = importee;
    } else {
      if (path.isAbsolute(importee)) {
        // 如果importee本身就是绝对路径
        route = importee;
      } else {
        route = path.resolve(
          path.dirname(importer),
          importee.replace(/\.js$/, "") + ".js"
        );
      }
    }
    if (route) {
      let code = fs.readFileSync(route, "utf8");
      const module = new Module({
        code,
        path: route,
        bundle: this,
      });
      return module;
    }
  }
  generator() {
    let bundle = new MagicString.Bundle();
    this.statements.forEach((statement) => {
      const replacements = {};
      Object.keys(statement._dependsOn)
        .concat(Object.keys(statement._defines))
        .forEach((name) => {
          const canonicalName = statement._module.getCanonicalName(name);
          if (name !== canonicalName) {
            replacements[name] = canonicalName;
          }
        });
      let source = statement._source.clone(); // 定义一个备份出来
      if (statement.type === "ExportNamedDeclaration") {
        // msg.js   export var name = 'name' 这种需要将export 截取掉
        source.remove(statement.start, statement.declaration.start);
      }
      replaceIdentifiers(statement, source, replacements); // 变量替换
      bundle.addSource({
        content: source,
        separator: "\n",
      });
    });
    return { code: bundle.toString() };
  }
}

module.exports = Bundle;
```

**utils.js**

```js{6-16,18}
const walk = require("./ast/walk");

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
function replaceIdentifiers(statement, source, replacements) {
  walk(statement, {
    enter(node) {
      if (node.type === "Identifier") {
        if (node.name && replacements[node.name]) {
          source.overwrite(node.start, node.end, replacements[node.name]);
        }
      }
    },
  });
}
exports.hasOwnProperty = hasOwnProperty;
exports.replaceIdentifiers = replaceIdentifiers;
```
