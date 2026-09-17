---
title: React 批量更新与合成事件
date: 2022-08-16
category: React
tags: [React, 事件]
---

- `State`的更新会被合并 当你调用 setState() 的时候，React 会把你提供的对象合并到当前的 state
- `State`的更新可能是异步的
  - 出于性能考虑，`React `可能会把多个`setState()`调用合并成一个调用
  - 因为`this.props`和`this.state`可能会异步更新，所以你不要依赖他们的值来更新下一个状态
  - 可以让`setState()`接收一个函数而不是一个对象。这个函数用上一个`state`作为第一个参数
- 事件处理
  - `React `事件的命名采用小驼峰式(camelCase),而不是纯小写
  - 使用`JSX`语法时你需要传入一个函数作为事件处理函数，而不是一个字符串
  - 不能通过返回`false`的方式阻止默认行为。你必须显式的使用`preventDefault`

**src/index.js**

- `1`和`2`处于批量更新逻辑中
- 当进入定时器后，批量更新处理的逻辑已经完了，退出了批量更新

```js{9-23,27,29}
import React from "./lib/react";
import ReactDOM from "./lib/react-dom";

class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { number: 0 };
  }
  handleClick = () => {
    this.setState({ number: this.state.number + 1 });
    console.log(this.state.number, "1"); // 0
    this.setState({ number: this.state.number + 1 });
    console.log(this.state.number, "2"); // 0
    setTimeout(() => {
      this.setState({ number: this.state.number + 1 });
      console.log(this.state.number, "3"); // 2
      this.setState({ number: this.state.number + 1 });
      console.log(this.state.number, "4"); // 3
    }, 50);
  };
  handleDivClick = () => {
    console.log("handleDivClick");
  };
  render() {
    const { number } = this.state;
    return (
      <div onClick={this.handleDivClick}>
        <p>Count: {number}</p>
        <button onClick={this.handleClick}>+</button>
      </div>
    );
  }
}

ReactDOM.render(<Counter />, document.getElementById("root"));
```

**lib/react-dom.js**

```js{1,80}
import { addEvent } from "./event";
import { REACT_TEXT } from "./element-types";

/**
 * 要把虚拟DOM转换成真实DOM并且挂载到容器中
 * @param {*} vdom 虚拟DOM
 * @param {*} container 容器
 */
function render(vdom, container) {
  mount(vdom, container);
}
function mount(vdom, container) {
  let newDOM = createDOM(vdom);
  container.appendChild(newDOM);
}
function createDOM(vdom) {
  const { props, type } = vdom;
  let dom; // 真实的DOM节点
  if (type === REACT_TEXT) {
    dom = document.createTextNode(props); // props是一个字符串
  } else if (typeof type === "function") {
    if (type.isReactComponent) {
      // 类组件
      return mountClassComponent(vdom);
    }
    return mountFunctionComponent(vdom); // 函数组件
  } else {
    dom = document.createElement(type);
  }
  if (props) {
    // 如果props存在，更新属性
    updateProps(dom, {}, props);
    if (typeof props.children === "object" && props.children.type) {
      // 说明只有一个子节点
      mount(props.children, dom); // 递归渲染子节点
    } else if (Array.isArray(props.children)) {
      reconcileChildren(props.children, dom);
    }
  }
  // 创建真实DOM的时候和虚拟DOM进行关联
  vdom.dom = dom;
  return dom;
}

function mountFunctionComponent(vdom) {
  const { props, type: FunctionComponent } = vdom;
  let renderVdom = FunctionComponent(props); // renderVdom才是要渲染的虚拟DOM
  // 保存老的虚拟DOM
  vdom.oldRenderVdom = renderVdom;
  return createDOM(renderVdom);
}
function mountClassComponent(vdom) {
  const { props, type: ClassComponent } = vdom;
  // 先创建类组件实例
  let classInstance = new ClassComponent(props);
  // 调用render方法返回renderVdom
  let renderVdom = classInstance.render();
  vdom.classInstance = classInstance; // vdom和实例进行关联
  // 类的实例上保存老的虚拟DOM，同时给vdom上也添加oldRenderVdom指向老的vdom
  classInstance.oldRenderVdom = vdom.oldRenderVdom = renderVdom;
  return createDOM(renderVdom);
}
function reconcileChildren(children, dom) {
  children.forEach((child) => {
    mount(child, dom);
  });
}

function updateProps(dom, oldProps = {}, newProps) {
  for (let key in newProps) {
    // 先遍历新的属性
    if (key === "children") continue;
    if (key === "style") {
      let styleObj = newProps[key];
      for (let attr in styleObj) {
        dom.style[attr] = styleObj[attr];
      }
    } else if (/^on[A-Z]*/.test(key)) {
      // 绑定的事件
      addEvent(dom, key.toLowerCase(), newProps[key]);
      // dom[key.toLowerCase()] = newProps[key]
    } else {
      // dom.className = 'title'
      dom[key] = newProps[key];
    }
  }
  // 再遍历老属性，如果新属性中没有直接删除掉
  for (let key in oldProps) {
    if (!newProps.hasOwnProperty(key)) {
      dom[key] = null;
    }
  }
}
/**
 * 根据虚拟DOM找到真实DOM
 * @param {*} vdom
 * 如果是像div节点，这样是可以通过vdom.dom找到真实DOM
 * 如果是类组件或者函数组件有两种情况
 *  1、创建函数/类组件的时候在虚拟DOM上通过oldRenderVdom绑定了虚拟DOM
 *  2、如果是组件嵌套组件，那就需要进行递归查找了
 */
export function findDOM(vdom) {
  if (!vdom) return null;
  if (vdom.dom) {
    // vdom对应原生的组件
    return vdom.dom;
  } else {
    // 类组件或函数组件
    let renderVdom = vdom.classInstance
      ? vdom.classInstance.oldRenderVdom
      : vdom.oldRenderVdom;
    return findDOM(renderVdom);
  }
}

export function compareTwoVdom(parentDOM, oldVdom, newVdom) {
  let oldDOM = findDOM(oldVdom); // 老的真实DOM
  let newDOM = createDOM(newVdom); // 新的真实DOM
  parentDOM.replaceChild(newDOM, oldDOM); // 新的替换老的
}

const ReactDOM = {
  render,
};
export default ReactDOM;
```

**lib/Component.js**

```js{3,14,26-32}
import { compareTwoVdom, findDOM } from "./react-dom";

export const updateQueue = {
  isBatchingUpdate: false, // 表示是否正在更新
  updaters: new Set(),
  batchUpdate() {
    // 批量更新
    updateQueue.isBatchingUpdate = false;
    for (let updater of updateQueue.updaters) {
      updater.updateComponent();
    }
    updateQueue.updaters.clear();
  },
};
class Updater {
  constructor(classInstance) {
    this.classInstance = classInstance;
    // 需要支持批量更新，所以这里必须是数组
    this.pendingStates = [];
  }
  addState(newState) {
    this.pendingStates.push(newState);
    this.emitUpdate();
  }
  emitUpdate() {
    if (updateQueue.isBatchingUpdate) {
      // 如果是批量更新
      updateQueue.updaters.add(this); // 把当前updater添加到set中
    } else {
      // 否则就直接更新
      this.updateComponent();
    }
  }
  updateComponent() {
    const { classInstance, pendingStates } = this;
    if (pendingStates.length > 0) {
      // 表示有更新的状态
      shouldUpdate(classInstance, this.getState());
    }
  }
  getState() {
    const { classInstance, pendingStates } = this;
    let { state } = classInstance; // 实例的老状态
    pendingStates.forEach((nextState) => {
      // 合并新老状态
      state = { ...state, ...nextState };
    });
    return state;
  }
}
function shouldUpdate(classInstance, nextState) {
  classInstance.state = nextState;
  classInstance.forceUpdate();
}
export class Component {
  static isReactComponent = true;
  constructor(props) {
    this.props = props;
    this.updater = new Updater(this);
  }
  setState(newState) {
    this.updater.addState(newState);
  }
  forceUpdate() {
    // 老的虚拟DOM
    let oldRenderVdom = this.oldRenderVdom;
    // 找到真的DOM
    let oldDOM = findDOM(oldRenderVdom);
    // 调用render方法获取新的虚拟DOM
    let newRenderVdom = this.render();
    compareTwoVdom(oldDOM.parentNode, oldRenderVdom, newRenderVdom);
    this.oldRenderVdom = newRenderVdom;
  }
}
```

**lib/event.js**

```js
import { updateQueue } from "./Component";

export function addEvent(dom, eventType, handler) {
  let store = dom.store || (dom.store = {});
  store[eventType] = handler;
  if (!document[eventType]) {
    document[eventType] = dispatchEvent;
  }
}

// 合成事件
function dispatchEvent(event) {
  let { target, type } = event;
  let eventType = `on${type}`; // 事件类型
  let syntheticEvent = createSyntheticEvent(target);
  updateQueue.isBatchingUpdate = true;
  let currentTarget = target;
  while (currentTarget) {
    // 模拟事件冒泡
    let { store } = currentTarget;
    let handler = store && store[eventType];
    handler && handler(syntheticEvent);
    // 如果已经调用了event.stopPropagation阻止了冒泡
    if (syntheticEvent.isPropagationStopped) {
      break;
    }
    currentTarget = currentTarget.parentNode;
  }
  updateQueue.batchUpdate();
}

function createSyntheticEvent(nativeEvent) {
  let syntheticEvent = {};
  for (let key in nativeEvent) {
    let value = nativeEvent[key];
    if (typeof value === "function") value = value.bind(syntheticEvent);
    syntheticEvent[key] = value;
  }
  syntheticEvent.nativeEvent = nativeEvent;

  syntheticEvent.isDefaultPrevented = false; // 是否阻止了默认事件
  syntheticEvent.preventDefault = preventDefault;
  syntheticEvent.isPropagationStopped = false; // 是否阻止了冒泡
  syntheticEvent.stopPropagation = stopPropagation;
  return syntheticEvent;
}

function preventDefault() {
  this.isDefaultPrevented = true;
  const event = this.nativeEvent;
  if (event.preventDefault) {
    event.preventDefault();
  } else {
    //IE
    event.returnValue = false;
  }
  this.isDefaultPrevented = true;
}

function stopPropagation() {
  this.isPropagationStopped = true;
  const event = this.nativeEvent;
  if (event.stopPropagation) {
    event.stopPropagation();
  } else {
    //IE
    event.cancelBubble = false;
  }
  this.isPropagationStopped = true;
}
```

## DOM 事件

- 事件是用户或浏览器自身执行的某种动作，而响应某个事件的函数叫做事件处理程序

### DOM 事件流

![DOM事件流](/images/notes/react/DOM-event-stream.jpg)

- 事件流包含三个阶段
  - 事件捕获阶段
  - 处于目标阶段
  - 事件冒泡阶段
- 首先发生的是事件捕获，然后是实际的目标接收到事件，最后阶段是冒泡阶段

#### 捕获阶段

- 是先由最上一级的节点先接收事件,然后向下传播到具体的节点`document->body->div->button`

#### 目标阶段

- 在目标节点上触发,称为目标阶段
- 事件目标是真正触发事件的对象

```
//w3c浏览器：event.target
//IE6、7、8： event.srcElement
let target = event.target || event.srcElement;
```

#### 冒泡阶段

- 事件开始时由最具体的元素(文档中嵌套层次最深的那个节点)接收,然后逐级向上传播 `button->div->body->document`

### addEventListener

- 任何发生在 W3C 事件模型中的事件，首是进入捕获阶段，直到达到目标元素，再进入冒泡阶段
- 可以选择是在捕获阶段还是冒泡阶段绑定事件处理函数
- `useCapture`参数是`true`，则在捕获阶段绑定函数，反之`false`，在冒泡阶段绑定函数

```
element.addEventListener(event, function, useCapture)
```

### 阻止冒泡

- 如果想要阻止事件的传播
  - 在微软的模型中你必须设置事件的`cancelBubble`的属性为`true`
  - 在 W3C 模型中你必须调用事件的`stopPropagation()`方法

```js
function stopPropagation(event) {
  if (!event) {
    // IE
    window.event.cancelBubble = true;
  }
  if (event.stopPropagation) {
    // W3C
    event.stopPropagation();
  }
}
```

### 阻止默认行为

- 如果想要阻止事件的默认行为
  - 在微软的模型中你必须设置事件的`returnValue`的属性为`false`
  - 在 W3C 模型中你必须调用事件的`preventDefault()`方法

```js
function preventDefault(event) {
  if (!event) {
    window.event.returnValue = false;
  }
  if (event.preventDefault) {
    event.preventDefault();
  }
}
```

### 事件代理

- 事件代理又称之为事件委托
- 事件代理是把原本需要绑定在子元素的事件委托给父元素，让父元素负责事件监听
- 事件代理是利用事件冒泡来实现的
- 优点
  - 可以大量节省内存占用，减少事件注册
  - 当新增子对象时无需再次对其绑定

```
<body>
    <ul id="list" onclick="show(event)">
        <li>item 1</li>
        <li>item 2</li>
        <li>item 3</li>
        <li>item n</li>
    </ul>
    <script>
        function show(event){
          alert(event.target.innerHTML);
        }
    </script>
</body>
```

## React 事件系统

- 合成事件是围绕浏览器原生事件充当跨浏览器包装器的对象,它们将不同浏览器的行为合并为一个 API,这样做是为了确保事件在不同浏览器中显示一致的属性

![React事件系统](/images/notes/react/React-event-stream.jpg)

```js
import * as React from "react";
import * as ReactDOM from "react-dom";
class App extends React.Component {
  parentRef = React.createRef();
  childRef = React.createRef();
  componentDidMount() {
    this.parentRef.current.addEventListener(
      "click",
      () => {
        console.log("父元素原生捕获");
      },
      true
    );
    this.parentRef.current.addEventListener("click", () => {
      console.log("父元素原生冒泡");
    });
    this.childRef.current.addEventListener(
      "click",
      () => {
        console.log("子元素原生捕获");
      },
      true
    );
    this.childRef.current.addEventListener("click", () => {
      console.log("子元素原生冒泡");
    });
    document.addEventListener(
      "click",
      () => {
        console.log("document原生捕获");
      },
      true
    );
    document.addEventListener("click", () => {
      console.log("document原生冒泡");
    });
  }
  parentBubble = () => {
    console.log("父元素React事件冒泡");
  };
  childBubble = () => {
    console.log("子元素React事件冒泡");
  };
  parentCapture = () => {
    console.log("父元素React事件捕获");
  };
  childCapture = () => {
    console.log("子元素React事件捕获");
  };
  render() {
    return (
      <div
        ref={this.parentRef}
        onClick={this.parentBubble}
        onClickCapture={this.parentCapture}
      >
        <p
          ref={this.childRef}
          onClick={this.childBubble}
          onClickCapture={this.childCapture}
        >
          事件执行顺序
        </p>
      </div>
    );
  }
}
ReactDOM.render(<App />, document.getElementById("root"));
/**
document原生捕获
父元素React事件捕获
子元素React事件捕获
父元素原生捕获
子元素原生捕获
子元素原生冒泡
父元素原生冒泡
子元素React事件冒泡
父元素React事件冒泡
document原生冒泡
 */
```

### 简易实现

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>event</title>
  </head>
  <body>
    <div id="root">
      <div id="parent">
        <div id="child">点击</div>
      </div>
    </div>
    <script>
      let root = document.getElementById("root");
      let parent = document.getElementById("parent");
      let child = document.getElementById("child");
      //listenToNativeEvent('click',false,root);
      //listenToNativeEvent( 'click',true,root);

      //root的捕获阶段的处理函数
      root.addEventListener(
        "click",
        (event) => dispatchEvent(event, true),
        true
      );
      //root的冒泡阶段的处理函数
      root.addEventListener(
        "click",
        (event) => dispatchEvent(event, false),
        false
      );
      function dispatchEvent(event, isCapture) {
        //console.log(event,isCapture);
        let paths = []; //事件的传播路径数组[child,parent,root,body,document]
        let currentTarget = event.target; //事件源
        while (currentTarget) {
          paths.push(currentTarget);
          currentTarget = currentTarget.parentNode;
        }
        if (isCapture) {
          //如果当前是捕获阶段
          for (let i = paths.length - 1; i >= 0; i--) {
            //[document,body,root,parent.child]
            let handler = paths[i].onClickCapture; //react捕获事件
            handler && handler();
          }
        } else {
          for (let i = 0; i < paths.length; i++) {
            //[child,parent,root,body,document]
            let handler = paths[i].onClick; //react冒泡事件
            handler && handler();
          }
        }
      }
      root.addEventListener(
        "click",
        (event) => console.log("根元素原生事件捕获"),
        true
      );
      root.addEventListener(
        "click",
        (event) => console.log("根元素原生事件冒泡"),
        false
      );
      parent.addEventListener(
        "click",
        () => {
          console.log("父元素原生事件捕获");
        },
        true
      );
      parent.addEventListener(
        "click",
        () => {
          console.log("父元素原生事件冒泡");
        },
        false
      );
      child.addEventListener(
        "click",
        () => {
          console.log("子元素原生事件捕获");
        },
        true
      );
      child.addEventListener(
        "click",
        () => {
          console.log("子元素原生事件冒泡");
        },
        false
      );
      parent.onClick = () => {
        console.log("React:父元素React事件冒泡");
      };
      parent.onClickCapture = () => {
        console.log("React:父元素React事件捕获");
      };
      child.onClick = () => {
        console.log("React:子元素React事件冒泡");
      };
      child.onClickCapture = () => {
        console.log("React:子元素React事件捕获");
      };
    </script>
  </body>
</html>
```
