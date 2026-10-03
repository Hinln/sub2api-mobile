# 发布与构建指南

API 基线为官方 Sub2API `v0.2.13`；本轮不修改或部署后端。首版只发布 iOS，
Android 暂缓。iOS 工程已提交到 `ios/`，由本机 Xcode/CocoaPods 直接构建；Expo
只用于 Web 开发资源和运行时模块，不使用 Expo/EAS 构建或托管签名服务。

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

## GitHub macOS 无签名构建（非发布门槛）

```bash
gh workflow run build-ios-unsigned.yml --ref codex/vexlune-hub
gh run list --workflow build-ios-unsigned.yml --limit 1
gh run watch <RUN_ID> --exit-status
gh run download <RUN_ID> --dir dist/ios
```

该 workflow 只执行 CocoaPods 与 `xcodebuild` 的无签名诊断构建；其 artifact 只能作
辅助诊断，不能作为本次原生 iOS 发布证据。接受的发布路径使用已提交 workspace
和本机 CocoaPods/Xcode，直接调用 `xcodebuild`，不运行 Expo prebuild。

Artifact 名称：`vexlune-ios-unsigned-v<version>-b<build>`（版本和 build number 从 `app.json` 自动读取；例如当前版本为 `vexlune-ios-unsigned-v1.0.1-b2`）。IPA 与 `.app.zip` 文件名也会随版本自动生成。

## Android（暂缓）

当前版本不触发 Android workflow，不生成 APK/AAB，也不配置 Android SDK、Java 或
签名。恢复 Android 范围后另行建立构建和验收记录。

## 本机原生构建

```bash
pnpm install --frozen-lockfile
pnpm run native:build:ios      # 默认 iOS Simulator / Release
```

本机 iOS 真机签名构建需要先接受 Xcode 许可、安装 CocoaPods、在 Xcode 登录开发者账号并配置证书/profile；随后设置 `IOS_SDK=iphoneos`、`IOS_DESTINATION='generic/platform=iOS'` 和 `CODE_SIGNING_ALLOWED=YES`，由 `xcodebuild` 完成 archive/export。
