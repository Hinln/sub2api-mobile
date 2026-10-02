# iOS 构建环境检查与阻塞

检查时间：2026-10-03（Asia/Shanghai）。

## 已确认

- Xcode 26.6（Build 17F113）已安装，`xcode-select` 指向 `/Applications/Xcode.app/Contents/Developer`。
- iOS 26.5 模拟器运行时和 iPhone 17 系列模拟器已安装。
- Expo SDK 54 的 iOS prebuild 在隔离目录成功生成 `VexluneMobileConsole.xcodeproj`；原生包随后由 Xcode 工具链编译。
- `xcodebuild` 能够开始编译并生成构建目录；代码签名身份查询返回 0 个身份，因此当前没有可用的本机 Apple Development/Distribution 证书。
- Xcode 偏好设置中残留两个开发团队记录（`6KW552MWV6` 公司团队、`2B5JU96JLT` Personal Team），但没有可用签名身份，不能据此认定 Apple Developer 会话仍然有效。

## 仍需补齐

1. 本机尚未接受 Xcode/Apple SDK 许可。需要在交互式终端执行 `sudo xcodebuild -license` 并接受条款。
2. CocoaPods 未安装；iOS 工程的 CocoaPods 检查阶段会因缺少 `Podfile.lock` 失败。建议安装与 Xcode 26 兼容的 CocoaPods 后运行 `pod install`。
3. 未在本机发现 provisioning profile 或 signing certificate。真机/TestFlight 构建必须在已登录的 Xcode 账户或受控 macOS Runner 中创建并保存这些凭据，禁止提交到仓库。
4. `pnpm dlx expo-doctor@1.20.4` 在本机直接运行通过 15/18 项；用临时 npm shim 重跑为 18/18。剩余本机差异只来自系统没有 npm，GitHub Actions runner 自带 npm，工作流会执行固定版本的 doctor。
5. 已触发远端 unsigned iOS workflow run `37051524996`，GitHub 返回 `The job was not started because your account is locked due to a billing issue`，因此当前没有 IPA/.app artifact 证据；需先恢复 GitHub Actions 计费状态。
6. Android 本机没有 `adb`、Java runtime 或 Android SDK；隔离目录 Expo Android prebuild 已通过，但 APK/AAB 需使用本机 Android SDK/Java 或 `build-android-native.yml` 原生 Gradle CI。

## 无人值守入口

完成上面环境准备后，使用目标仓库的 GitHub Actions：

```bash
gh workflow run build-ios-unsigned.yml --ref codex/vexlune-hub
gh run list --workflow build-ios-unsigned.yml --limit 1
gh run watch <RUN_ID> --exit-status
gh run download <RUN_ID> --dir dist/ios
```

正式 TestFlight/生产签名使用 macOS 上的 `xcodebuild archive` 与 `xcodebuild -exportArchive`，通过 Keychain、provisioning profile 和 App Store Connect API key 注入；Android 生产包使用 Gradle `bundleRelease`，通过 CI Secret 注入 keystore。不要把 Apple 密码、私钥、profile 或 keystore 写入脚本。
