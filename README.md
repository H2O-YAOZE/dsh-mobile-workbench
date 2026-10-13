# DSH Mobile Workbench · DSH 移动云端工作台

基于 DeepSeek Harness 的独立扩展项目：云端运行 Agent，手机通过 WebView 或浏览器访问，集中查看项目、文件来源、中文代码翻译和用量。

这不是 DeepSeek 官方产品，也不包含模型权重。当前为首个开源实验版（0.1.0-alpha.1）。需要自行提供服务器、HTTPS 域名和模型账户。

[English](README.en.md) · [安装说明](docs/CONFIGURATION.md) · [发布检查](docs/RELEASE_READINESS.md)

## 为什么做

使用近两个月后，我希望把分散的 AI 项目和文件集中管理，并在不打开个人电脑时，通过手机继续修改云端项目。项目工作台把文件、产生文件的对话和后续修改关联起来；代码翻译便于阅读项目结构和改动。

## 包含什么

- 移动界面、配对网关和通知接口：`packages/mobile-ui`。
- 项目工作台、文件来源关联、按需中文翻译、邮箱附件目录、用量视图和手机操作协议：`packages/workbench`。
- 文档读取插件及读取预算限制：`packages/document-reader`。
- Android WebView 外壳、文件选择、原生通知及需要用户授权的手机操作：`android`。

没有聊天记录、个人项目、邮箱目录或附件、生产配置、密钥、模型账户信息。示例目录为空。邮箱集成需要你自行授权自己的邮箱；代码不会向作者邮箱发送内容。

## 架构与限制

手机 → HTTPS / 配对网关 → Harness / 插件 → 已注册项目。模型通过 API 调用，服务器不加载大模型权重。项目文件在文件系统，索引保存关联关系；不把所有源码塞进聊天数据库。

Web UI / 插件更新通常不必重装 APK；原生权限、桥接和系统通知能力更新仍需新 APK。服务器可持续运行不等于任务永不停止，任务占用仍须限制。电脑用量入口是上传的快照，不保证所有工具的实时计量。翻译需要模型 Token，首次按需生成并缓存；打开目录本身不发模型请求。

安全能力表述限于认证、授权、隔离和资源保护。本仓库不提供对第三方系统自动反击的能力，也不能保证网站永不被攻击。生产服务器的完整防御工程不是本次导出范围。

## 开发验证

```sh
npm ci --ignore-scripts
npm test
npm run verify:ui
npm run build:ui
```

依赖构建和从零部署的实际验证结果见 [发布检查](docs/RELEASE_READINESS.md)。安装步骤见 [配置说明](docs/CONFIGURATION.md)，从既有官方 web profile 加载本仓库扩展。尚未提供经过完整验收的一键部署。

Android 要求 JDK 17、Android SDK 34 和 Gradle 8.9（当前不附 wrapper）：

```sh
cd android
gradle assembleDebug -PdshBaseUrl=https://your-domain.example
```

默认域名为 `example.invalid`；发布版请自行签名。不同 applicationId 的公开示例不能覆盖安装你的私人 APK。

## 安全与开源范围

参见 [SECURITY](SECURITY.md)、[上游与许可](THIRD_PARTY_NOTICES.md)、[配置说明](docs/CONFIGURATION.md)。部署前必须核对认证入口、仅绑定内网的服务端口、项目注册范围和独立备份。不要把 Agent 以不受约束的 root 权限提供给任意访客。
