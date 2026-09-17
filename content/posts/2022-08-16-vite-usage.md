---
title: Vite 使用要点
date: 2022-08-16
category: 工程化
tags: [Vite]
---

## 遍历文件夹

- 使用 <a>glob</a>进行遍历

```js
// 多入口
const genInputOpt = () => {
  let inputOpt = {};
  glob.sync("./src/pages/*/main.js").forEach((filepath) => {
    let fileList = filepath.split("/");
    let len = fileList.length;
    let fileName = fileList[len - 2];
    if (fileName === "m") {
      inputOpt[fileName] = resolve(__dirname, `index.html`);
    } else {
      inputOpt[fileName] = resolve(__dirname, `${fileName}/index.html`);
    }
  });
  return inputOpt;
};

export default defineConfig({
  build: {
    rollupOptions: {
      input: genInputOpt(),
    },
  },
});
```

## 定义 less 全局变量

- 借助`css.preprocessorOptions`来完成

```js
export default {
  css: {
    preprocessorOptions: {
      less: {
        additionalData: `@import "${resolve(
          __dirname,
          "src/pages/m/assets/style/variable.less"
        )}";`, // less变量文件夹，这样可以全局中使用
      },
    },
  },
};
```
