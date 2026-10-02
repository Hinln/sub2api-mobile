# 发布与构建指南

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

工作流动态发现 Workspace/Scheme，执行 Expo Prebuild、CocoaPods、`iphoneos` Release 编译并关闭签名，校验主程序包含 arm64，最后打包 `Payload/Vexlune.app`。

Artifact 名称：`vexlune-ios-unsigned-v1.0.1`。

## EAS 签名构建前置条件

首次使用已认证 EAS 账号执行一次 `eas project:init`，将生成的 `extra.eas.projectId` 保留在 `app.json`；GitHub Actions 只从 `EXPO_TOKEN` Secret 读取云端凭据。未完成账号登录、项目关联和 iOS credentials 配置前，不能运行 `--non-interactive` 的 preview/production 构建。
