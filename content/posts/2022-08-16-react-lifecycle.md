---
title: React 生命周期
date: 2022-08-16
category: React
tags: [React, 生命周期]
---

![生命周期](/images/notes/react/life-cycle.jpg)

## 基础生命周期

**src/index.js**

```js
import React from "./lib/react";
import ReactDOM from "./lib/react-dom";

class Counter extends React.Component {
  constructor() {
    super();
    this.state = {
      number: 0,
    };
    console.log("Counter 1.constructor");
  }
  componentWillMount() {
    console.log("Counter 2.componentWillMount");
  }
  handleAdd = () => {
    this.setState({ number: this.state.number + 1 });
  };
  render() {
    console.log("Counter 3.render");
    return (
      <div>
        <p>{this.state.number}</p>
        <button onClick={this.handleAdd}>+</button>
      </div>
    );
  }
  componentDidMount() {
    console.log("Counter 4.componentDidMount");
  }
  shouldComponentUpdate() {
    console.log("Counter 5.shouldComponentUpdate");
    return true;
  }
  componentWillUpdate() {
    console.log("Counter 6.componentWillUpdate");
  }
  componentDidUpdate() {
    console.log("Counter 7.componentDidUpdate");
  }
}
ReactDOM.render(<Counter />, document.getElementById("root"));
/* 
初次渲染：constructor,componentWillMount,render,componentDidMount
更新：shouldComponentUpdate, componentWillUpdate, componentDidUpdate
*/
```

**lib/react-dom.js**

- 需要注意的是调用`componentDidMount`的时机是在`createDOM`之后,因为如果存在子组件的情况下，当父组件调用`render`后会进入子组件的流程，当子组件`componentDidMount`后再父组件`componentDidMount`

```js{68,76}
import { addEvent } from "./event";
import { REACT_FORWARD_REF, REACT_TEXT } from "./element-types";

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
  const { props, type, ref } = vdom;
  let dom; // 真实的DOM节点
  if (type && type.$$typeof === REACT_FORWARD_REF) {
    // 挂载forward组件
    return mountForwardComponent(vdom);
  } else if (type === REACT_TEXT) {
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
  if (ref) ref.current = dom;
  return dom;
}

function mountForwardComponent(vdom) {
  const { type, props, ref } = vdom;
  let renderVdom = type.render(props, ref);
  vdom.oldRenderVdom = renderVdom;
  return createDOM(renderVdom);
}

function mountFunctionComponent(vdom) {
  const { props, type: FunctionComponent } = vdom;
  let renderVdom = FunctionComponent(props); // renderVdom才是要渲染的虚拟DOM
  // 保存老的虚拟DOM
  vdom.oldRenderVdom = renderVdom;
  return createDOM(renderVdom);
}
function mountClassComponent(vdom) {
  const { props, type: ClassComponent, ref } = vdom;
  // 先创建类组件实例
  let classInstance = new ClassComponent(props);
  if (ref) ref.current = classInstance; // 类组件添加ref
  if (classInstance.componentWillMount) classInstance.componentWillMount();
  // 调用render方法返回renderVdom
  let renderVdom = classInstance.render();
  vdom.classInstance = classInstance; // vdom和实例进行关联
  // 类的实例上保存老的虚拟DOM，同时给vdom上也添加oldRenderVdom指向老的vdom
  classInstance.oldRenderVdom = vdom.oldRenderVdom = renderVdom;
  // 这里需要在createDOM之后调用componentDidMount,是因为还有子组件的原因，父组件挂载完成是要在子组件挂载完成才能完成
  let dom = createDOM(renderVdom);
  if (classInstance.componentDidMount) classInstance.componentDidMount();
  return dom;
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

```js{52-65,85-87}
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
  let willUpdate = true;
  classInstance.state = nextState;
  if (
    classInstance.shouldComponentUpdate &&
    !classInstance.shouldComponentUpdate()
  ) {
    willUpdate = false;
  }
  if (willUpdate && classInstance.componentWillUpdate) {
    classInstance.componentWillUpdate();
  }
  if (willUpdate) {
    classInstance.forceUpdate();
  }
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
    if (this.componentDidUpdate) {
      this.componentDidUpdate();
    }
  }
}
```

## 子组件生命周期

![生命周期](/images/notes/react/life-cycle1.jpg)

**src/index.js**

```js
import React from "./lib/react";
import ReactDOM from "./lib/react-dom";

class ChildCounter extends React.Component {
  constructor(props) {
    super(props);
    console.log("ChildCounter 1.constructor");
  }
  componentWillMount() {
    console.log("ChildCounter 2.componentWillMount");
  }
  render() {
    console.log("ChildCounter 3.render");
    return <p>{this.props.count}</p>;
  }
  componentDidMount() {
    console.log("ChildCounter 4.componentDidMount");
  }
  shouldComponentUpdate() {
    console.log("ChildCounter 5.shouldComponentUpdate");
    return true;
  }
  componentWillUpdate() {
    console.log("ChildCounter 6.componentWillUpdate");
  }
  componentDidUpdate() {
    console.log("ChildCounter 7.componentDidUpdate");
  }
}
class Counter extends React.Component {
  constructor() {
    super();
    this.state = {
      number: 0,
    };
    console.log("Counter 1.constructor");
  }
  componentWillMount() {
    console.log("Counter 2.componentWillMount");
  }
  handleAdd = () => {
    this.setState({ number: this.state.number + 1 });
  };
  render() {
    console.log("Counter 3.render");
    return (
      <div>
        <p>{this.state.number}</p>
        <ChildCounter count={this.state.number} />
        <button onClick={this.handleAdd}>+</button>
      </div>
    );
  }
  componentDidMount() {
    console.log("Counter 4.componentDidMount");
  }
  shouldComponentUpdate() {
    console.log("Counter 5.shouldComponentUpdate");
    return true;
  }
  componentWillUpdate() {
    console.log("Counter 6.componentWillUpdate");
  }
  componentDidUpdate() {
    console.log("Counter 7.componentDidUpdate");
  }
}
ReactDOM.render(<Counter />, document.getElementById("root"));
```
