# iOS 构建环境检查与阻塞

检查时间：2026-10-03（Asia/Shanghai）。

## 已确认

- Xcode 26.6（Build 17F113）已安装，`xcode-select` 指向 `/Applications/Xcode.app/Contents/Developer`。
- iOS 26.5 模拟器运行时和 iPhone 17 系列模拟器已安装。
- Expo SDK 54 的 iOS prebuild 在隔离目录成功生成 `VexluneMobileConsole.xcodeproj`。
- `xcodebuild` 能够开始编译并生成构建目录；代码签名身份查询返回 0 个身份，因此当前没有可用的本机 Apple Development/Distribution 证书。
- Xcode 偏好设置中残留两个开发团队记录（`6KW552MWV6` 公司团队、`2B5JU96JLT` Personal Team），但没有可用签名身份，不能据此认定 Apple Developer 会话仍然有效。

## 仍需补齐

1. 本机尚未接受 Xcode/Apple SDK 许可。需要在交互式终端执行 `sudo xcodebuild -license` 并接受条款。
2. CocoaPods 未安装；iOS 工程的 CocoaPods 检查阶段会因缺少 `Podfile.lock` 失败。建议安装与 Xcode 26 兼容的 CocoaPods 后运行 `pod install`。
3. EAS CLI 可通过 `pnpm dlx eas-cli` 临时运行（当前版本 24.8.0），但 `pnpm dlx eas-cli whoami` 返回 `Not logged in`；当前不能把本机当作已授权的无人值守云构建环境。GitHub Actions 的 `EXPO_TOKEN`、Apple App Store Connect/API 凭据和签名凭据仍应放在 GitHub/EAS Secret 中。
4. 未在本机发现 provisioning profile 或 signing certificate。真机/TestFlight 构建必须在 EAS 或已登录的 Xcode 账户中创建并保存这些凭据，禁止提交到仓库。
5. `pnpm dlx expo-doctor` 能运行，但报告项目同时存在 `pnpm-lock.yaml` 和 `package-lock.json`，并因系统没有 `npm` 无法完成两项依赖树检查；这需要在 CI 使用明确的 pnpm 工具链验证，或补齐 npm 后重新运行。

## 无人值守入口

完成上面环境准备后，使用目标仓库的 GitHub Actions：

```bash
gh workflow run build-ios-unsigned.yml --ref codex/vexlune-hub
gh run list --workflow build-ios-unsigned.yml --limit 1
gh run watch <RUN_ID> --exit-status
gh run download <RUN_ID> --dir dist/ios
```

正式 TestFlight/生产签名使用 `eas build --non-interactive --profile preview|production --platform ios`，并通过 `EXPO_TOKEN`、EAS 项目凭据和 App Store Connect 发行凭据注入；不要把 Apple 密码或私钥写入脚本。
