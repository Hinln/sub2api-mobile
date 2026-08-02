# 构建信息

- 源码分支：`codex/vexlune-ios-production`
- App：Hub Vexlune 1.0.2 (3)
- Bundle ID：`com.vexlune.mobile`
- URL Scheme：`vexlunemobile`
- 目标：iPhoneOS / Release / arm64
- 未签名 Artifact：`hub-vexlune-ios-unsigned-v1.0.2`
- 未签名 IPA：`Hub-Vexlune-v1.0.2-ios-unsigned.ipa`
- 签名 IPA 建议名称：`Hub-Vexlune-v1.0.2-ios-signed.ipa`

GitHub macOS 工作流会在编译前校验 `app.json`、`package.json` 与工作流中的名称、Bundle ID、Version 和 Build Number 完全一致。编译后会再从 `Info.plist` 读回验证，并将 Workspace、Scheme、架构、签名状态和 SHA-256 写入 Artifact。

Windows 不具备 Xcode；真实 iPhoneOS 二进制必须使用 GitHub macOS Runner 或其他可信 macOS 构建机生成。手机当前未连接，本轮不执行安装。
