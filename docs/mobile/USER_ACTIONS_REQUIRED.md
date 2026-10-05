# Vexlune Hub 仍需人工完成的事项

本文只记录不能由代码代理安全代办的外部操作。API 合同固定为官方 Sub2API
`v0.2.13`（`3040209f205472038c1ba745a1bedd2edd9053b1`）；本轮不修改或部署
后端，不执行生产迁移或 Cloudflare 变更。

## 当前必须由产品方完成

1. **非生产验收环境**：提供可撤销的管理员 Admin Key 及已批准的非生产 origin，按官方管理接口完成只读 dashboard、401/403/423、审计、支付结果和权限验收。本版本不需要普通用户账号，也不要部署私有 `/mobile/captcha/*` bridge。
2. **App Store Connect 上传**：ASC iOS 版本已对齐为 `1.0.1`；仍需配置 ASC API key（`.p8`、issuer、key ID）。配置后可运行 `scripts/upload-ios-appstore.sh` 上传已验证 IPA，也可由产品方用 Transporter/Xcode 上传。
3. **真机验收**：连接并信任一台已加入 provisioning profile 的实体 iPhone，完成登录、provider captcha、支付、注销和权限路径验收。
4. **App Store Connect 资料**：补齐截图、隐私政策 URL、支持 URL、描述/关键词、年龄分级、税务与价格、审核账号、出口合规，并选择发布方式。

## 不需要产品方处理

- GitHub CLI 已配置，两个仓库是独立仓库，开发分支和提交可以继续由本流程管理。
- GitHub Actions 暂不启用不会阻止本机 Xcode 构建；原生 iOS 直接使用已提交 workspace 和 Xcode，不使用 Expo/EAS 构建。
- Apple Developer 法律协议已由产品方完成；后续只剩签名凭据、真机和商店资料门槛。
- Android 按当前范围暂缓；不配置 Android SDK、签名或 APK/AAB 发布。

## 当前本机证据

- Xcode 26.6，Team `6KW552MWV6`，Bundle ID `com.vexlune.mobile`。
- iPhone 17 Pro Max Simulator 已可用；本机没有连接实体 iPhone。
- Apple Development 与 iPhone Distribution identity 均有效；新的 App Store profile 已安装，签名 IPA 已通过验证。
- iPhoneOS unsigned archive 已完成编译和 JS 打包；签名 archive/IPA 已通过；剩余为外部发布与真实环境验收。
