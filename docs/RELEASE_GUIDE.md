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

## GitHub macOS 未签名构建

```bash
gh workflow run build-ios-unsigned.yml --repo Hinln/sub2api-mobile --ref codex/vexlune-ios-production
gh run list --repo Hinln/sub2api-mobile --workflow build-ios-unsigned.yml --limit 1
gh run watch <RUN_ID> --repo Hinln/sub2api-mobile --exit-status
gh run download <RUN_ID> --repo Hinln/sub2api-mobile --dir dist/ios
```

也可在当前 PowerShell 会话设置 `$env:GH_REPO='Hinln/sub2api-mobile'` 后省略每条命令的 `--repo`；不要依赖当前目录的 Git remote 自动推断仓库。

工作流会动态发现 Workspace/Scheme，执行 Expo Prebuild、CocoaPods 和 `iphoneos` Release 编译，并显式关闭签名。它会校验主程序包含 arm64，再打包 `Payload/HubVexlune.app`。

- Artifact：`hub-vexlune-ios-unsigned-v1.0.2`
- IPA：`Hub-Vexlune-v1.0.2-ios-unsigned.ipa`
- App Bundle ZIP：`Hub-Vexlune-v1.0.2-ios-app.zip`

## 签名与交付

1. 先检查 provisioning profile 的 `application-identifier` 与 `com.vexlune.mobile` 完全匹配。
2. 在 macOS 临时 Keychain 中导入 P12，不在命令行、日志或仓库中写入密码。
3. 比对 P12 代码签名身份与 profile 内 `DeveloperCertificates` 指纹。
4. 嵌入 profile，先签名 Frameworks，再签名主 App。
5. 执行 `codesign --verify --deep --strict`，校验 Bundle ID、Version / Build、entitlements 和 IPA `Payload` 结构。
6. 输出 `Hub-Vexlune-v1.0.2-ios-signed.ipa` 及 SHA-256，再复制到用户桌面。

当前提供的 profile 与 `com.vexlune.mobile` 不匹配，具体检查结果见 `docs/BUILD_BLOCKERS.md`。
