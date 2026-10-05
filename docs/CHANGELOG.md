# Changelog

## Unreleased — administrator-only Admin Key pivot (2026-10-05)

- 将 Vexlune Hub 产品定位改为管理员专用控制台；移除普通用户认证与用户工作台
  作为产品入口。
- 登录首屏改为官方 Sub2API Admin Key；使用 `x-api-key` 验证
  `GET /api/v1/admin/settings/admin-api-key`，成功后才保存凭据。
- Admin Key 仅保存于 iOS SecureStore/Keychain（`WHEN_UNLOCKED_THIS_DEVICE_ONLY`），
  不写入 URL、请求体、日志、剪贴板、Query cache 或崩溃报告。
- 固化 401 无效/撤销 key、403 权限拒绝、423 合规确认和 429 限流处理；不伪造成功、
  不绕过 AdminAuth 或 Cloudflare。
- 更新管理员专用 API 覆盖矩阵、安全模型、架构审计、QA 和 Admin Key 合同文档。
- 保持官方 Sub2API `v0.2.13` 生产合同；没有生产服务器、数据库、Cloudflare 规则或
  secret 变更。Android 继续暂缓，iOS 仍走原生 Xcode/CocoaPods 构建。

## 1.0.1

- Defaulted first launch to the persisted light theme, with dark and system options.
- Added a read-only exception center and current-page account selection mode.
- Clarified dashboard billing semantics and introduced the billing-field audit.
- Updated the unsigned iOS workflow and artifact naming for version 1.0.1 / build 2.
- Added a fail-closed native App Store Connect upload command that accepts only an external API key and `.p8` path.

## 1.0.0 - 2026-08-02

- 更名并重塑为 Vexlune Mobile Console。
- 固定 Hub/API 域名边界，解除上游项目与云构建绑定。
- 新增邮箱密码 + Bearer JWT/refresh 认证、SecureStore、401 清理与生物识别应用锁。
- 重构类型化 API Client、超时、取消、Request ID、错误映射和安全重试。
- 完成概览、用户、账号、日志、分组、用户 API Key 与安全设置。
- 新增 Vitest、Playwright、三视口截图和无签名 iOS GitHub Actions 工作流。
