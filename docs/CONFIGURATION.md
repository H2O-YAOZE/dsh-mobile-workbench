# 安装与配置（首个实验版）

这是官方 DeepSeek Harness 的扩展仓库。运行环境为 Node.js 24+、Python 3 和已有可正常运行的官方 `web` profile。线上参考运行时是 Harness 0.2.0-rc.2，UI 开发声明依赖是 0.1.7-rc.2。源码构建和隔离插件测试已验证；**全新 Linux 服务器的完整安装尚未端到端验证**。

## 1. 获取并构建本仓库

```sh
git clone https://github.com/H2O-YAOZE/dsh-mobile-workbench.git
cd dsh-mobile-workbench
npm ci --ignore-scripts
npm test
npm run build:ui
```

`npm install dsh-zen-remote` 安装的是上游包，不包含本仓库的工作台定制。必须使用下面的本地包路径。

## 2. 配置既有 Harness profile

先按官方说明安装并启动 Harness web，完成模型配置。在单独测试账户/测试 profile 验证；修改前备份 profile。

在 `~/.dsh/profiles/web/package.json` 中**合并**以下字段，保留原有依赖和 bundles。示例假定仓库存放在 `/srv/dsh-mobile-workbench`，请换成实际绝对路径。

```json
{
  "dependencies": {
    "dsh-zen-remote": "link:/srv/dsh-mobile-workbench/packages/mobile-ui",
    "dsh-plugin-doc-reader": "link:/srv/dsh-mobile-workbench/packages/document-reader"
  },
  "dsh": {
    "profile": {
      "bundles": ["dsh-zen-remote", "dsh-plugin-doc-reader"]
    }
  }
}
```

上例只列新增 bundles，不能覆盖原有项。按该 profile 原有的 pnpm 安装方式更新依赖；不要混用锁文件。仓库根目录依赖仍由 npm 锁文件管理，包括文档解析的安全覆盖规则。

在同一 profile 的 `cordis.patch.yml` 追加工作台插件：

```yaml
- insert:
    - id: dsh-usage-sync
      name: /srv/dsh-mobile-workbench/packages/workbench/index.js
      config:
        dataDirectory: /srv/dsh-state/usage-sync
        projectDirectory: /srv/dsh-state/projects
        gateState: /home/dsh/.dsh/lan-gate-state.json
```

工作台需要 webServer、sessions、tools、fs、llm、sessionQuery、workspaceController、connection 服务。运行账户必须能访问状态目录，gateState 必须是同一个移动网关的实际状态文件。所有状态目录仅授予运行账户权限（Linux 0700），状态文件为 0600。首次启动会生成空 catalog，不扫描整个云服务器，也不自动导入作者的项目。

`DSH_WORKSPACE_ROOT` 指定授权的项目发现根目录，默认 `~/dsh`。项目注册信息可按 `examples/catalog.example.json` 的结构管理，根目录只填写明确授权的项目，不填写 `/`、个人主目录或凭据目录。只在停止服务或通过维护流程时编辑索引，避免覆盖运行中的改动。

## 3. 网关、HTTPS 和配对

重启 `dsh web`，按移动 UI 的配对入口给自己的设备授权。网关默认监听 `127.0.0.1:3088`；由同机 HTTPS 反向代理转发到网关，不能把 Harness 内部端口直接暴露公网。反向代理应覆盖转发头，网关仅信任明确配置的代理地址。

验证未配对访问 `/usage`、`/projects/api/catalog`、`/artifacts` 返回拒绝；配对后可打开空项目列表、用量页并创建测试会话。完整 DNS/TLS、真实模型、备份恢复和实体手机测试需要部署者在自己的环境完成。

## 4. 可选邮箱与 Android

邮箱适配当前仅支持 163 IMAP。`DSH_MAIL_USER`、`DSH_MAIL_PASSWORD` 放在私有服务环境，后者为邮箱客户端授权码。无需邮箱功能时不设置。索引与附件仅留在部署者的服务器，不在开源仓库内。发送邮件沿用部署者另外配置的发送工具，本仓库目录工具本身不自动代发邮件。

Android：JDK17、SDK34、Gradle8.9，执行 `gradle assembleDebug -PdshBaseUrl=https://your-domain.example`。默认 example.invalid 不可连接；正式包自行签名。手机操作默认关闭，需用户主动勾选应用并临时授权；坐标滑动在此实验版中禁用。

## 更新与回滚

先保留上一版本的源码、锁文件和私有状态备份，查看 diff，再在隔离环境构建测试。停止服务后切换版本并重启；确认网关配对、文件上传和项目列表。失败时回切旧代码及相应配置。不要用旧会话中保存的完整源码覆盖新版文件；个人数据和备份不提交 Git。
