# Vexlune Hub 发布运行手册

原生包构建只使用本机或 GitHub Actions 的 Xcode/Gradle 工具链。Expo 仅负责生成原生工程（prebuild）和 Web 资源；禁止使用 Expo 云构建、云更新或托管签名。

## 发布前

1. 后端先完成数据库迁移、Go 单元/集成测试和 staging smoke test，确认 `/mobile/captcha/turnstile` 使用第一方 HTTPS 域名。
2. Cloudflare 配置只放在服务端：WAF、TLS、速率限制和 Turnstile secret 不进入 APP、CI 环境变量或日志。
3. 执行 `scripts/verify-mobile-origin.sh`（可用 `BASE_URL=https://staging.example.com` 覆盖域名），确认 settings JSON、非法 action 拒绝和第一方 bridge 未被 SPA 截获；再执行 `pnpm install --frozen-lockfile`、`pnpm exec tsc --noEmit`、`pnpm exec expo lint`、`pnpm exec vitest run`、`pnpm run web:build`。
4. Android 构建按当前产品范围暂缓，不触发 Android workflow；重新开放 Android 范围时再生成 APK/AAB 并补齐对应签名证据。
5. 触发 `build-ios-unsigned.yml` 或本机 Xcode 流程生成 iPhoneOS Release 包；签名 TestFlight/生产包必须在受控 macOS Runner 或本机用 Xcode `archive`/`-exportArchive` 完成，凭据由 macOS Keychain/CI Secret 提供。
6. 按 [APP_STORE_CONNECT_CHECKLIST.md](./APP_STORE_CONNECT_CHECKLIST.md) 检查 Bundle ID、版本/build、隐私与支持链接、截图、年龄分级、审核账号和出口合规；没有这些资料不能提交审核。

## 构建命令

```bash
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm exec expo lint
pnpm exec vitest run
pnpm run web:build
pnpm run native:build:ios
# Signed device archive (requires the Apple Development/Distribution identity
# to be unlocked in the macOS Keychain and Automatic signing enabled in Xcode).
IOS_SDK=iphoneos CODE_SIGNING_ALLOWED=YES CODE_SIGNING_REQUIRED=YES \
  CODE_SIGN_IDENTITY='Apple Development' pnpm run native:build:ios
# App Store Connect/TestFlight（本机钥匙串必须已有 Apple Distribution 私钥）
./scripts/export-ios-appstore.sh
```

`export-ios-appstore.sh` 先用 `CODE_SIGNING_ALLOWED=NO` 编译本地 iPhoneOS archive，避免把 App Store profile 错误应用到 CocoaPods 静态库；`xcodebuild -exportArchive` 再使用已安装的 App Store profile 和 Apple Distribution identity 完成签名。脚本会在缺少 Distribution 私钥或 profile 时 fail-closed，不会生成伪成功的 IPA。

## 上线顺序

先发布后端兼容版本和迁移，再发布 APP。先小范围 TestFlight/内部测试，确认登录、Turnstile、支付幂等、余额审计和管理员权限后再扩大发布。移动端只依赖版本化 API 契约，后端保留旧网页客户端兼容窗口。

## 观测

记录发布 commit、后端迁移版本、Android/iOS 构建 ID、Gradle/Xcode 构建日志摘要、Cloudflare 规则版本和 staging 验收账号。监控 401/403/429、Turnstile 失败率、支付幂等冲突、刷新失败、崩溃和 API p95；不要记录 access token、refresh token、支付凭据或 Turnstile secret。

## TestFlight 交付证据

签名归档完成后，保存以下可审计信息到发布记录（不要提交证书、私钥或 provisioning profile）：

- Xcode archive 路径、归档 UUID、`CFBundleIdentifier`、短版本号和 build number。
- `xcodebuild -exportArchive` 使用的导出方式（App Store/TestFlight）及导出日志摘要。
- App Store Connect build ID、上传时间、处理状态和 TestFlight 内部测试结果。
- 上传包的 SHA-256、对应源码 commit、后端 commit/迁移版本和 QA 报告链接。

签名包只能从受控 macOS Keychain 或 CI Secret 注入凭据后生成；无签名 IPA 仅用于架构和包结构验证，不能上传 TestFlight。
