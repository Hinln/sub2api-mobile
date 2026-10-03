# 发布与构建指南

移动端原生包始终由本机或 GitHub Actions 的 Xcode/Gradle 工具链构建。Expo 只用于生成 `ios/`、`android/` 原生工程和 Web 开发资源，不使用 Expo 云构建或托管签名服务。

## 本地质量门

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm test
pnpm dlx expo-doctor@1.20.4
pnpm run web:build
pnpm run test:visual
```

## GitHub macOS 无签名构建

```bash
gh workflow run build-ios-unsigned.yml --ref codex/vexlune-hub
gh run list --workflow build-ios-unsigned.yml --limit 1
gh run watch <RUN_ID> --exit-status
gh run download <RUN_ID> --dir dist/ios
```

工作流动态发现 Workspace/Scheme，执行 Expo Prebuild、CocoaPods、原生 `xcodebuild` 的 `iphoneos` Release 编译并关闭签名，校验主程序包含 arm64，最后打包 `Payload/Vexlune.app`。

Artifact 名称：`vexlune-ios-unsigned-v<version>-b<build>`（版本和 build number 从 `app.json` 自动读取；例如当前版本为 `vexlune-ios-unsigned-v1.0.1-b2`）。IPA 与 `.app.zip` 文件名也会随版本自动生成。

## GitHub Ubuntu 原生 Android 构建

```bash
gh workflow run build-android-native.yml --ref codex/vexlune-hub -f variant=debug -f artifact=apk
gh run list --workflow build-android-native.yml --limit 1
gh run watch <RUN_ID> --exit-status
gh run download <RUN_ID> --dir dist/android
```

工作流在 Ubuntu Runner 安装 Java 17、Android SDK 和 Gradle 依赖，执行 `expo prebuild --platform android` 生成原生工程，再运行 `./gradlew :app:assembleDebug`、`:app:assembleRelease` 或 `:app:bundleRelease`。APK artifact 来自 `android/app/build/outputs/apk/<variant>/`，AAB artifact 来自 `android/app/build/outputs/bundle/release/`；工作流会按所选类型上传对应目录。生产 AAB/签名 APK 需要在受控 CI 或本机配置 Android keystore，并通过环境变量/密钥存储注入，禁止提交 keystore。

## 本机原生构建

```bash
pnpm install --frozen-lockfile
pnpm run native:build:ios      # 默认 iOS Simulator / Release
pnpm run native:build:android # 默认 Android Release APK
```

本机 iOS 真机签名构建需要先接受 Xcode 许可、安装 CocoaPods、在 Xcode 登录开发者账号并配置证书/profile；随后设置 `IOS_SDK=iphoneos`、`IOS_DESTINATION='generic/platform=iOS'` 和 `CODE_SIGNING_ALLOWED=YES`，由 `xcodebuild` 完成 archive/export。Android 发布构建需要 `ANDROID_GRADLE_TASK=:app:bundleRelease` 与本机 keystore 配置。
