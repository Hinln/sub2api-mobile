# iOS 构建环境检查与阻塞

检查时间：2026-10-03（Asia/Shanghai）。

## 已验证

- Xcode 26.6（Build 17F113）已安装，xcode-select 指向 /Applications/Xcode.app/Contents/Developer，首次启动检查通过。
- CocoaPods 1.15.2 已安装在 RubyGems 用户目录；脚本会自动发现该路径并为 macOS 系统 Ruby 2.6 预加载 logger。
- ios/Pods、Podfile.lock 和 CocoaPods workspace 已生成。
- iOS Simulator Release 构建通过，产物为 build/ios/Build/Products/Release-iphonesimulator/VexluneMobileConsole.app，包含 arm64 与 x86_64。
- iPhoneOS Release 未签名构建通过，产物为 build/ios-device/Build/Products/Release-iphoneos/VexluneMobileConsole.app，主程序为 arm64；已验证可打包为 IPA，压缩包完整性通过。
- 本机存在 Apple Development: YONGCHI PAN (KRVKFG5D67) 与 iPhone Distribution: Sichuan Xiashi Network Technology Service Co., Ltd 证书，Team ID 为 6KW552MWV6；`app.json` 已固定该 Team，prebuild 会写入 Debug/Release 的 `DEVELOPMENT_TEAM`。
- 已创建并安装 App Store provisioning profile `Vexlune Mobile Console App Store 20261003 Distribu`，Bundle ID 为 `com.vexlune.mobile`，有效期至 2027-10-03。
- 已按最终提交重新导出并验证签名 IPA：`build/appstore-export/VexluneMobileConsole.ipa`，SHA-256 `91487dece48615694740b9d7c2b90029e63a19c54c6563b1c2c821a388503f01`，`codesign --verify --deep --strict` 通过。

## 尚未完成的发布条件

1. 本机签名条件已满足，App Store Connect 版本已对齐为 `1.0.1`；当前剩余发布条件是上传 `1.0.1 (2)` IPA，并在真实 iPhone/TestFlight 完成验收。
2. GitHub Actions run 37051524996 在执行步骤前因账号 billing issue 失败（steps=0、无日志和 artifact）；恢复计费后才可取得云端 artifact。该问题不影响本机原生构建。
3. Cloudflare 生产区域规则、Turnstile secret、staging origin 和真实账号联调仍需在目标环境完成；secret 不能进入 APP 或仓库。
4. Android 按当前范围暂缓；本机没有 Android SDK/Java/adb，build-android-native.yml 只保留后续使用的原生 Gradle 入口。

## 无人值守入口

本地无签名构建：

    pnpm run native:build:ios
    IOS_SDK=iphoneos IOS_DESTINATION='generic/platform=iOS' pnpm run native:build:ios

GitHub Actions 恢复后：

    gh workflow run build-ios-unsigned.yml --ref codex/vexlune-hub
    gh run list --workflow build-ios-unsigned.yml --limit 1
    gh run watch <RUN_ID> --exit-status
    gh run download <RUN_ID> --dir dist/ios

正式 TestFlight/生产签名使用 macOS 上的 xcodebuild archive 与 xcodebuild -exportArchive，通过 Keychain、provisioning profile 和 App Store Connect API key 注入；不要把 Apple 密码、私钥、profile 或 keystore 写入脚本。
