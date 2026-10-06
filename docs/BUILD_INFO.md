# 构建信息

更新时间：2026-10-06（Asia/Shanghai）。

- 源码分支：codex/vexlune-hub
- App：Vexlune Mobile Console 1.0.1 (3)
- Bundle ID：com.vexlune.mobile
- Scheme：VexluneMobileConsole
- JavaScript 包管理器：pnpm 11.19.0；仓库仅保留 pnpm-lock.yaml
- Expo Web 构建：通过
- iOS 原生工程：已提交（`ios/`），不运行 Expo prebuild
- iOS Simulator Release：通过；arm64/x86_64
- iPhoneOS Release：通过；arm64。
- 当前提交 `839a335` 已完成 App Store Distribution archive/export；产物为 `build/appstore-export-839a335/VexluneMobileConsole.ipa`，版本 `1.0.1 (3)`，SHA-256 `2903ec426518610c96ee3d2e4c60da16f81a1068fb7b3bf8531e3c1ec9855130`，archive dSYM UUID `CBC5924B-9EB3-332A-9337-033714D7BBEB`；解包后的 App 通过 `codesign --verify --deep --strict`。
- 本机证书：Apple Development: YONGCHI PAN (KRVKFG5D67)、iPhone Distribution: Sichuan Xiashi Network Technology Service Co., Ltd；Team ID 6KW552MWV6
- App Store profile：`Vexlune Mobile Console App Store 20261003 Distribu`，Bundle ID `com.vexlune.mobile`，有效期至 2027-10-03
- `app.json` 与版本化 `ios/` 工程固定 `ios.appleTeamId=6KW552MWV6` 和 Debug/Release 的 `DEVELOPMENT_TEAM`
- CocoaPods：1.15.2，用户 RubyGems 安装；scripts/native-build-ios.sh 会自动处理 PATH 与 Ruby 2.6 Logger 兼容性
- 原生构建入口：pnpm run native:build:ios；iOS 使用 React Native bundler + Xcode/CocoaPods，不使用 Expo/EAS 构建
- GitHub Actions unsigned iOS run 37051524996：在步骤前因 billing issue 失败（steps=0），未产生云端 artifact
- Android：按当前范围暂缓；未生成 APK/AAB

当前签名 IPA 已通过本机验证，并由 Apple Transporter 于 2026-10-06 13:10（Asia/Shanghai）成功交付到 App Store Connect（Delivery UUID `cb9286fa-4cbd-4a93-9b7c-e75a3509bbcd`，日志为 `UPLOAD SUCCEEDED with no errors`）。Transporter 当前显示 `APP 可供内部测试`；真实 iPhone 验收仍待完成，不能将内部测试可用写成实体设备验收通过。
