# 发布与构建指南

## 本地质量门

```bash
npm ci
npm run typecheck
npm run lint
npm test
npx expo-doctor
npm run web:build
npm run test:visual
```

## GitHub macOS 无签名构建

```bash
gh workflow run build-ios-unsigned.yml --ref codex/vexlune-ios-admin
gh run list --workflow build-ios-unsigned.yml --limit 1
gh run watch <RUN_ID> --exit-status
gh run download <RUN_ID> --dir dist/ios
```

工作流动态发现 Workspace/Scheme，执行 Expo Prebuild、CocoaPods、`iphoneos` Release 编译并关闭签名，校验主程序包含 arm64，最后打包 `Payload/Vexlune.app`。

Artifact 名称：`vexlune-ios-unsigned-v1.0.0`。
