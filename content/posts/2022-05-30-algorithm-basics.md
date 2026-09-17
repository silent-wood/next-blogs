---
title: 算法基础：大 O 与时间复杂度
date: 2022-05-30
category: 算法
tags: [算法]
summary: "度量一个程序的执行时间通常有两种方法："
---

**大 O 标识法和时间复杂度**  
度量一个程序的执行时间通常有两种方法：

- 事后统计的方法

```js
// 会受到电脑当前运行的环境，以及电脑配置等因素有关系
console.time("AAA");
for (let i = 0; i < 999; i++) {}
console.timeEnd("AAA");
```

- 事前分析估算方法 `O`
  > O(1) < O(log2(n)) < O(n) < O(n^2) < O(n^3) < ... < O(2^n)

O(1): 如果算法的执行时间不随着问题规模 n 的增加而正常，即使算法中有很多语句，其执行时间也不过是一个较大的常数

```js
let a = 12;
let b = 13;
let temp = a;
a = b;
b = temp;
```

O(log2(n)): 当数据增大 n 倍时，耗时增大 logn 倍(这里的 log 是以 2 为地的，比如，当数据增大 256 倍，耗时只增大 8 倍)

```js
let i = 1;
while (i <= 100) {
  i *= 2;
}
```

O(n):当数据增大几倍，耗时也增大几倍

```js
for (let i = 0; i < 100; i++) {}
```

O(n^2):数据量增大 n 倍时，耗时增大 n 的平方倍,通常是循环套循环

```js
for (let i = 0; i < 10; i++) {
  for (let j = 1; j <= 10; j++) {}
}
```

O(2^n): 耗时以指数级增长

**以排序算法为例**

```js
let array = [12, 8, 14, 16, 1];
```

- 冒泡排序
  <img width="80%" src="../.vuepress/public/images/algorithm/bubble.png" />
