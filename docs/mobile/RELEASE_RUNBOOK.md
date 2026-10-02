# Vexlune Hub 发布运行手册

原生包构建只使用本机或 GitHub Actions 的 Xcode/Gradle 工具链。Expo 仅负责生成原生工程（prebuild）和 Web 资源；禁止使用 Expo 云构建、云更新或托管签名。

## 发布前

1. 后端先完成数据库迁移、Go 单元/集成测试和 staging smoke test，确认 `/mobile/captcha/turnstile` 使用第一方 HTTPS 域名。
2. Cloudflare 配置只放在服务端：WAF、TLS、速率限制和 Turnstile secret 不进入 APP、CI 环境变量或日志。
3. 执行 `pnpm install --frozen-lockfile`、`pnpm exec tsc --noEmit`、`pnpm exec expo lint`、`pnpm exec vitest run`、`pnpm run web:build`。
4. 触发 `build-android-native.yml` 生成 Android debug/release APK（`-f artifact=apk`）；生产 AAB 使用 `-f variant=release -f artifact=aab`，凭据由 CI Secret 注入。
5. 触发 `build-ios-unsigned.yml` 生成无签名 iPhoneOS Release IPA；签名 TestFlight/生产包必须在受控 macOS Runner 或本机用 Xcode `archive`/`-exportArchive` 完成，凭据由 macOS Keychain/CI Secret 提供。

## 构建命令

```bash
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm exec expo lint
pnpm exec vitest run
pnpm run web:build
pnpm run native:build:android
pnpm run native:build:ios
```

## 上线顺序

先发布后端兼容版本和迁移，再发布 APP。先小范围 TestFlight/内部测试，确认登录、Turnstile、支付幂等、余额审计和管理员权限后再扩大发布。移动端只依赖版本化 API 契约，后端保留旧网页客户端兼容窗口。

## 观测

记录发布 commit、后端迁移版本、Android/iOS 构建 ID、Gradle/Xcode 构建日志摘要、Cloudflare 规则版本和 staging 验收账号。监控 401/403/429、Turnstile 失败率、支付幂等冲突、刷新失败、崩溃和 API p95；不要记录 access token、refresh token、支付凭据或 Turnstile secret。
