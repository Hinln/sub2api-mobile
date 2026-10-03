# Vexlune Hub 仍需人工完成的事项

本文只记录不能由代码代理安全代办的外部操作。代码、后端改造、测试、模拟器构建和仓库提交由自动化流程继续完成。

## 当前必须由产品方完成

1. **后端上线**：部署 `Hinln/sub2api` 的 `5ea52f8`（含 `/mobile/captcha/*` 路由修复），配置服务端 Turnstile secret，并修正 Cloudflare 到 origin 的路由；secret 不进入 APP、仓库或日志。
2. **staging 验收账号**：提供可撤销的普通用户和管理员账号，在 staging 上完成真实登录、Turnstile、支付幂等和管理员权限验收。
3. **数据库集成环境**：提供可运行 PostgreSQL 的 staging/CI 环境，执行 migration integration tests。
4. **Apple Distribution 签名**：在 Xcode 中创建/确认 Apple Distribution certificate 与 App Store provisioning profile；当前机器只有有效的 Apple Development certificate/profile，能做开发与模拟器构建，不能上传 TestFlight。
5. **真机验收**：连接并信任一台已加入 provisioning profile 的实体 iPhone，完成登录、Turnstile、支付、注销和权限路径验收。
6. **App Store Connect 资料**：补齐截图、隐私政策 URL、支持 URL、描述/关键词、年龄分级、税务与价格、审核账号、出口合规，并选择发布方式。

## 不需要产品方处理

- GitHub CLI 已配置，两个仓库是独立仓库，开发分支和提交可以继续由本流程管理。
- GitHub Actions 暂不启用不会阻止本机 Xcode 构建；当前失败原因是 GitHub billing，而不是代码或签名配置。
- Android 按当前范围暂缓。
- 不需要 Expo/EAS 云构建；原生 iOS 工程使用本机 Xcode 工具链。

## 当前本机证据

- Xcode 26.6，Team `6KW552MWV6`，Bundle ID `com.vexlune.mobile`。
- iPhone 17 Pro Max Simulator 已可用；本机没有连接实体 iPhone。
- Apple Development identity 有效；Distribution identity/profile 仍缺失。
