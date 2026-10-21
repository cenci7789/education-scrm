# 教培 CRM 系统原型

使用 HTML、CSS 和原生 JavaScript 实现的教培业务交互原型，包含线索管理、跟进沟通、报名选班、收费订单、预约试听和教务管理等功能。

## 本地预览

使用浏览器打开项目根目录的 `index.html`。

## 项目说明

- `index.html`：页面入口。
- 根目录中的 JavaScript 和 CSS：业务交互及页面样式。
- `templates/`：导入模板。
- `tests/`：基于 Node.js 的功能检查脚本。

这是交互原型，演示数据主要保存在页面内存中。支付、电话、企微等真实服务需要另外接入；上传附件的临时预览不等同于服务端持久化存储。

## 运行检查

安装 Node.js 后，在项目目录运行相应检查，例如：

```sh
node tests/lead-registration.cjs
node tests/trials.cjs
```
