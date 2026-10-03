# 构建信息

更新时间：2026-10-03（Asia/Shanghai）。

- 源码分支：codex/vexlune-hub
- App：Vexlune Mobile Console 1.0.1 (2)
- Bundle ID：com.vexlune.mobile
- Scheme：VexluneMobileConsole
- JavaScript 包管理器：pnpm 11.19.0；仓库仅保留 pnpm-lock.yaml
- Expo Web 构建：通过
- iOS prebuild：通过
- iOS Simulator Release：通过；arm64/x86_64
- iPhoneOS Release：通过；arm64，另已完成 App Store Distribution archive/export
- 签名 IPA：`build/appstore-export/VexluneMobileConsole.ipa`，版本 `1.0.1 (2)`，SHA-256 `91487dece48615694740b9d7c2b90029e63a19c54c6563b1c2c821a388503f01`；`codesign --verify --deep --strict` 通过
- 本机证书：Apple Development: YONGCHI PAN (KRVKFG5D67)、iPhone Distribution: Sichuan Xiashi Network Technology Service Co., Ltd；Team ID 6KW552MWV6
- App Store profile：`Vexlune Mobile Console App Store 20261003 Distribu`，Bundle ID `com.vexlune.mobile`，有效期至 2027-10-03
- `app.json` 已固定 `ios.appleTeamId=6KW552MWV6`；prebuild 会写入 Debug/Release 的 `DEVELOPMENT_TEAM`
- CocoaPods：1.15.2，用户 RubyGems 安装；scripts/native-build-ios.sh 会自动处理 PATH 与 Ruby 2.6 Logger 兼容性
- 原生构建入口：pnpm run native:build:ios；Expo 仅用于生成原生工程，不使用 Expo 云构建或托管签名
- GitHub Actions unsigned iOS run 37051524996：在步骤前因 billing issue 失败（steps=0），未产生云端 artifact
- Android：按当前范围暂缓；未生成 APK/AAB

签名 IPA 已通过本机验证，但尚未上传 App Store Connect；TestFlight、真实 iPhone 验收和 App Review 资料仍未完成。
