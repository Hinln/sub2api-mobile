# Vexlune Mobile Console

Vexlune Hub 的个人 iOS/Android 移动管理控制台。项目基于 Expo 54、React Native、Expo Router、TanStack Query、Valtio 与 SecureStore。

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

登录和注册只使用邮箱与密码；登录后由服务端识别普通用户或管理员并进入对应工作台。Cloudflare 挑战通过第一方 WebView 获取一次性 token，APP 不保存 secret。会话令牌仅写入系统 SecureStore；Web 验收不持久化凭据。

无签名 iOS 真机构建由 `.github/workflows/build-ios-unsigned.yml` 在 macOS Runner 完成。未签名 IPA 不能直接安装，请先阅读 `docs/SIGNING_GUIDE.md`。
Android 原生 APK 由 `.github/workflows/build-android-native.yml` 在 Ubuntu Runner 使用 Gradle 构建。签名包须在受控本机/CI 注入证书和 keystore 后执行原生发布任务。

## 开源归属

本项目基于 [ckken/sub2api-mobile](https://github.com/ckken/sub2api-mobile) 改造，保留原始 `LICENSE`、版权与依赖许可证信息。生产后端以私有 [Hinln/sub2api](https://github.com/Hinln/sub2api) 为唯一源，`Wei-Shaw/sub2api` 仅用于公开契约对照。
