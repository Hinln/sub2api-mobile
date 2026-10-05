# Vexlune Mobile Console

Vexlune Hub 是仅面向管理员的 iOS 移动管理控制台。项目基于 Expo 54、React Native、Expo Router、TanStack Query、Valtio 与 SecureStore；Android 当前暂缓。

Expo 仅用于开发、Web 导出和 Android 原生工程生成；iOS 工程已提交到 `ios/`，移动端安装包由本机或 GitHub Actions 的 Xcode/Gradle 原生工具链构建，不使用 Expo 云构建或云更新。

- 管理服务：`https://hub.vexlune.com`
- 模型 API（仅展示边界）：`https://api.vexlune.com`
- Bundle ID：`com.vexlune.mobile`
- URL Scheme：`vexlunemobile`
- Version / Build：`1.0.1 / 2`

## 本地验证

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run web:build
pnpm run test:visual
pnpm run native:build:ios      # 需要 Xcode、CocoaPods；默认构建 iOS Simulator
# 当前版本范围暂缓 Android；重新开放后再运行 Android 原生构建
```

本机签名 iOS 归档和 App Store Connect 上传使用 Apple 原生工具链：

```bash
pnpm run native:build:ios
sh scripts/export-ios-appstore.sh
ASC_API_KEY_ID='YOUR_KEY_ID' ASC_ISSUER_ID='YOUR_ISSUER_ID' \
ASC_API_PRIVATE_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_YOUR_KEY_ID.p8" \
  pnpm run native:upload:ios
```

`.p8` 私钥必须保存在仓库外；上传脚本不会接受 Apple 密码，也不会把私钥写入日志。详见 `docs/mobile/RELEASE_RUNBOOK.md`。

首屏只接受官方 Sub2API Admin Key，通过 HTTPS 的 `x-api-key` 请求头验证后进入管理员控制台。APP 不提供普通用户邮箱密码登录、注册或用户工作台；Admin Key 仅写入系统 SecureStore，模拟器缺少 Keychain entitlement 时只保留在进程内存。Cloudflare/Turnstile 不由 Admin Key 登录绕过。

无签名 iOS 真机构建由 `.github/workflows/build-ios-unsigned.yml` 在 macOS Runner 完成。未签名 IPA 不能直接安装，请先阅读 `docs/SIGNING_GUIDE.md`。
Android 原生构建工作流已保留但当前版本范围暂缓，不执行 APK/AAB 或 Android QA；重新开放 Android 范围后，才在受控本机/CI 注入证书和 keystore 并运行原生发布任务。

## 开源归属

本项目基于 [ckken/sub2api-mobile](https://github.com/ckken/sub2api-mobile) 改造，保留原始 `LICENSE`、版权与依赖许可证信息。移动端目标 API 合同为官方 [Wei-Shaw/sub2api](https://github.com/Wei-Shaw/sub2api) `v0.2.13`；私有 [Hinln/sub2api](https://github.com/Hinln/sub2api) 仅用于审计，不作为本版本部署源。
