# Vexlune Hub 发布运行手册

## 发布前

1. 后端先完成数据库迁移、Go 单元/集成测试和 staging smoke test，确认 `/mobile/captcha/turnstile` 使用第一方 HTTPS 域名。
2. Cloudflare 配置只放在服务端：WAF、TLS、速率限制和 Turnstile secret 不进入 APP、EAS 环境变量或日志。
3. 执行 `pnpm install --frozen-lockfile`、`pnpm exec tsc --noEmit`、`pnpm exec expo lint`、`pnpm exec vitest run`、`pnpm run web:build`。
4. 使用 EAS 的 `preview` profile 生成 Android internal distribution 和 iOS internal distribution，安装到测试设备完成真实账号验收。
5. 生产构建使用 `production` profile；凭据由 EAS/GitHub Secret 提供，提交前核对 bundle ID `com.vexlune.mobile`、版本号和变更日志。

## 构建命令

```bash
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm exec expo lint
pnpm exec vitest run
pnpm run web:build
eas build --non-interactive --profile preview --platform all
eas build --non-interactive --profile production --platform all
```

## 上线顺序

先发布后端兼容版本和迁移，再发布 APP。先小范围 TestFlight/内部测试，确认登录、Turnstile、支付幂等、余额审计和管理员权限后再扩大发布。移动端只依赖版本化 API 契约，后端保留旧网页客户端兼容窗口。

## 观测

记录发布 commit、后端迁移版本、Android/iOS 构建 ID、Cloudflare 规则版本和 staging 验收账号。监控 401/403/429、Turnstile 失败率、支付幂等冲突、刷新失败、崩溃和 API p95；不要记录 access token、refresh token、支付凭据或 Turnstile secret。
