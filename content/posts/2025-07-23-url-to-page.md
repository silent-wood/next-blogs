---
title: URL 到页面的过程
date: 2025-07-23
category: JavaScript
tags: [浏览器, 网络]
summary: "URI：统一资源标识符，URL和URN算是其子集"
---

<h3 id="sV5mX">URL解析</h3>
URI：统一资源标识符，URL和URN算是其子集

URL：统一资源定位符

URN：统一资源名称

完整的URL地址如下：

![](/images/notes/yuque/1610333758573-1f357c3d-ea0e-411b-9519-5175ea652d31.png)

<h4 id="4QQ8i">传输协议</h4>
客户端和服务器端的信息传输协议

HTTP: 超文本传输协议，1.0/1.1/2.0

HTTPS: HTTP+SSL(TSL)比HTTP更安全

FTP:文件的上传下载[本地文件部署到服务器或者基于服务器拉取]

...

<h4 id="yi3Fw">域名</h4>
对服务器外网IP的一个重命名，分顶级/一级/二级/...，有.cn/.com/.net/.org/..

<h4 id="SrKJP">端口号</h4>
区分一个服务器上不同的服务，范围0-65535，每种协议包含一个默认端口

HTTP：80，HTTPS: 443，FTP: 21...

<h4 id="O12lJ">请求资源的文件路径</h4>
URL重写

查询字符串[问号传参]：客户端之间传递参数、客户端传递信息到服务器

<h4 id="OdESy">HASH值</h4>
锚点定位、HASH路由

<h4 id="hI3HM">查询字符串</h4>
编码问题：处理中文，特殊符号等

encodeURI/decodeURI：对整个URL编码，处理中文

encodeURIComponent/decodeURIComponent：对传递的参数进行编码，处理中文、特殊字符

escape/unescapy：客户端对中文进行编码，一般只用于客户端的信息传递，如cookie

基于自己设定的加密机密规则处理，对称加密

对于某些信息，采用非对称加密，不可解密的，如md5

```javascript
let str = `http://www.xx.com/api/list?lx=1&word=${encodeURIComponent("测试信息")}&from=${encodeURIComponent("http://www.qq.com/")}`;
console.log(str)
```

<h3 id="3C09F">缓存检查</h3>
静态资源文件的缓存，根据客户端和服务器协商规则自动去完成缓存策略，而接口数据则需要通过代码完成

<h4 id="vROcO">缓存位置</h4>
内存缓存(Memory Cache)：页面没有关闭，只是刷新

硬盘缓存(Disk Cache)：页面关闭重新打开

打开页面：查看硬盘缓存中是否有匹配

普通刷新(F5)：因为tab页没有关闭，所以内存缓存是可用的，会优先使用，其次才是硬盘缓存

<font style="color:rgb(44, 63, 81);">强制刷新(Ctrl+F5)：</font><font style="color:rgb(44, 63, 81);">浏览器不使用缓存，因此发送的请求头部均带有 Cache-control: no-cache，服务器直接返回 200 和最新内容</font>

<h4 id="ygHUq">缓存处理</h4>
<font style="color:#F5222D;">有强缓存就用强缓存，没有就用协商缓存，没有协商缓存就重新获取并缓存</font>

强缓存：HTTP1.0(Expires)/HTTP1.1(Cache-Control)

不管是从服务器获取还是强缓存中获取HTTP相应状态码都是200

强缓存不适用于静态页面缓存，如html文件，因为如果页面做了缓存，以后服务器更新了内容

还是走的缓存数据，像css，js等可以根据情况生成类似时间戳或者随机数来保证不去获取缓存的内容

<font style="color:#F5222D;">过程：</font>

客户端发送请求后，服务器会检测缓存信息和缓存标识，有并且没有过期，客户端直接获取缓存内的。如果没有或者已经过期，客户端重新向服务器发送请求，服务器端返回结果和标识，客户端把结果和标识重新缓存起来

协商缓存：HTTP1.0(Last-Modified/If-Modified-Since)/HTTP1.1(ETag/If-None-Match)

静态页面使用协商缓存，其他的可以使用强缓存+协商缓存

<font style="color:#F5222D;">过程：</font>

第一次请求没有任何标识，当服务起返回后带着Last-Modified(当前文件在服务器上最后更新的日期)，客户端会将标识存储起来，第二次发送请求后会带上If-Modified-Since(值是上次存储起来的值)，服务端接收到后会进行对比，如果没有更新会返回304，不返回内容，有更新就返回200同时返回内容，并且将最新时间更新，客户端获取后再更新存储的值，方便后面带上

Last-Modified和ETag两者间ETag比较好，前者存储的时间是以秒为单位，有可能在一秒内文件已经更新，但是客户端获取的不是最新的，但是后者是通过一个标识来的，只要标识不一样就会获取最新的。

数据缓存

本地存储：cookie/localStorage/sessionStorage

cookie：

作用主要是用来辨识客户端身份的

存储内容上(4KB)

存储时间为设置的时间

信息默认在客户端和服务端来回传输，内容过多的话影响通信速度

不稳定，可以基于安全工具清除，用户也可以禁用cookie

web stroage：

主要是客户端保存一些信息，和服务器端没有关系

localStroage:

存储内容最多5M，持久保存

sessionStorage:

页面关闭就没有了

vuex/redux等：

类似于全局变量，页面刷新就没有了

<h3 id="iv7ka">DNS解析</h3>
分为递归查询和迭代查询

![](/images/notes/yuque/1610524067757-038cc5be-67a3-41b9-95ce-bbccfd3cbf5b.png)

每次DNS解析时间大概在20-120ms，减少DNS解析次数，

DNS预获取(DNS Prefetch):利用页面渲染的异步性，解析DNS并缓存起来，后期就直接获取解析记录

```html
<meta http-equiv="x-dns-prefetch-control" content="on">
<link rel="dns-prefetch" href="服务器地址"/>
```

<h3 id="rJJgK">TCP三次握手</h3>
建立客户端和服务器之间的网络连接通道，再基于HTTP/HTTPS传输信息

TCP网络通信：更加稳定可靠[三次握手/四次挥手]，但是也会比较慢

UDP网络通信：通道建立比较快，但是不稳定，并且传输过程中可能会丢失



<font style="color:rgb(44, 63, 81);">seq序号，用来标识从TCP源端向目的端发送的字节流，发起方发送数据时对此进行标记</font>

<font style="color:rgb(44, 63, 81);">ack确认序号，只有ACK标志位为1时，确认序号字段才有效，ack=seq+1</font>

<font style="color:rgb(44, 63, 81);">标志位</font>

<font style="color:rgb(44, 63, 81);">ACK：确认序号有效</font>

<font style="color:rgb(44, 63, 81);">RST：重置连接</font>

<font style="color:rgb(44, 63, 81);">SYN：发起一个新连接</font>

<font style="color:rgb(44, 63, 81);">FIN：释放一个连接</font>

![](/images/notes/yuque/1619061249593-78634458-93b1-4f68-bf03-3afad5b7d3aa.png)

![](/images/notes/yuque/1610372155899-22cbff32-02c7-4565-9664-8ace7c77c5d2.png)

<h3 id="DQ062">数据通信</h3>
HTTP事务：一次完整的请求和响应，称为一次HTTP事务

HTTP报文：客户端和服务器通信的所有内容，统称HTTP报文

起始行、请求响应头、请求响应主体

常见的响应状态吗

<font style="color:rgb(44, 63, 81);">200 OK</font>

<font style="color:rgb(44, 63, 81);">202 Accepted ：服务器已接受请求，但尚未处理（异步）</font>

<font style="color:rgb(44, 63, 81);">204 No Content：服务器成功处理了请求，但不需要返回任何实体内容</font>

<font style="color:rgb(44, 63, 81);">206 Partial Content：服务器已经成功处理了部分 GET 请求（断点续传 Range/If-Range/Content-Range/Content-Type:”multipart/byteranges”/Content-Length….）</font>

<font style="color:rgb(44, 63, 81);">301 Moved Permanently 永久重定向，域名迁移</font>

<font style="color:rgb(44, 63, 81);">302 Move Temporarily 临时重定向，负载均衡</font>

<font style="color:rgb(44, 63, 81);">304 Not Modified 协商缓存有效返回</font>

<font style="color:rgb(44, 63, 81);">305 Use Proxy 使用代理</font>

<font style="color:rgb(44, 63, 81);">400 Bad Request 请求参数有误</font>

<font style="color:rgb(44, 63, 81);">401 Unauthorized 权限（Authorization）</font>

<font style="color:rgb(44, 63, 81);">403 Forbidden 服务器拒绝执行</font>

<font style="color:rgb(44, 63, 81);">404 Not Found 地址错误</font>

<font style="color:rgb(44, 63, 81);">405 Method Not Allowed 请求方式不允许</font>

<font style="color:rgb(44, 63, 81);">408 Request Timeout 请求超时</font>

<font style="color:rgb(44, 63, 81);">409 Conflict 请求的资源与资源当前状态冲突</font>

<font style="color:rgb(44, 63, 81);">410 Gone 服务器上的资源被永久性删除</font>

<font style="color:rgb(44, 63, 81);">500 Internal Server Error 未知的服务器错误</font>

<font style="color:rgb(44, 63, 81);">503 Service Unavailable 超负荷</font>

<font style="color:rgb(44, 63, 81);">505 HTTP Version Not Supported HTTP版本不支持</font>

<h3 id="kfRBI">四次挥手</h3>
正常情况下，每次HTTP请求都会走4、5、6三步，但是会消耗性能

Connection: keep-alive长连接-保持TCP通信通道暂时不断开，HTTP1.1以后默认设置了这个属性

断开TCP连接：当浏览器检测有段时间没有发送请求后，会自动关闭长连接



<font style="color:rgb(44, 63, 81);">服务器端收到客户端的SYN连接请求报文后，可以直接发送SYN+ACK报文</font>

<font style="color:rgb(44, 63, 81);">但关闭连接时，当服务器端收到FIN报文时，很可能并不会立即关闭链接，所以只能先回复一个ACK报文，告诉客户端：”你发的FIN报文我收到了”，只有等到服务器端所有的报文都发送完了，我才能发送FIN报文，因此不能一起发送，故需要四步握手</font>



![](/images/notes/yuque/1619063037953-b42284d5-48ea-4090-9249-7db6142d4976.png)

![](/images/notes/yuque/1610372170372-bf48127f-50fe-4ce4-998a-eecc51a5231a.png)



<h4 id="SxXIh">=======================================================</h4>
HTTP：0.9：1991，1.0：1996，1.1：1999，2.0：2015

<h3 id="oJG36">HTTP1.1和HTTP1.0的区别</h3>
+ 缓存处理：1.0使用Last-Modified/Expires来作为缓存标准，1.1使用ETag/Cache-Control
+ 带宽优化及网络连接的应用：1.1支持断点续传，返回的状态码是206
+ 错误通知的处理：1.1新增了24个状态码，如409(Conflict)请求的资源与当前资源的状态冲突，410(Gone)服务器上的某个资源被永久删除
+ HOST头处理：<font style="color:#2C3F51;">在HTTP1.0中认为每台服务器都绑定一个唯一的IP地址，因此，请求消息中的URL并没有传递主机名（hostname）。但随着虚拟主机技术的发展，在一台物理服务器上可以存在多个虚拟主机（Multi-homed Web Servers），并且它们共享一个IP地址。HTTP1.1的请求消息和响应消息都应支持Host头域，且请求消息中如果没有Host头域会报告一个错误（400 Bad Request）</font>
+ 长连接：1.0默认开启了Connection: keep-alive，一定程度上弥补了每次请求都需要重新开辟连接通道

<h3 id="gRgng">HTTP2.0与HTTP1.x的区别</h3>
+ 新的二进制格式(Binary Format)：1.x的解析是基于文本，二进制相对健壮
+ header压缩：<font style="color:#2C3F51;">1.x的header带有大量信息，而且每次都要重复发送，HTTP2.0使用encoder来减少需要传输的header大小，通讯双方各自cache一份header fields表，既避免了重复header的传输，又减小了需要传输的大小</font>
+ <font style="color:#2C3F51;">服务端推送(Server push)：如获取style.css，服务端可以主动推送style.js，在后面获取style.js的时候，从缓存中获取</font>

![](/images/notes/yuque/1610528917137-0743d060-601b-45cb-91f0-650bd6b09325.png)

+ <font style="color:#2C3F51;">多路复用：</font>

<font style="color:#2C3F51;">1.0每次响应请求，建立通道，用完关闭</font>

<font style="color:#2C3F51;">1.1长连接，通道建立后不会立即关闭，请求是串行执行，如果前一个请求碰到问题如超时或者网络问题的话后续都会被阻塞</font>

<font style="color:#2C3F51;">2.0多路复用：请求在一个通道上是并行执行，一个请求碰到问题，其他请求不会被阻塞</font>









