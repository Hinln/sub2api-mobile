# Admin Key 合同与排障说明

更新日期：2026-10-05（Asia/Shanghai）。

本说明适用于 Vexlune Hub 管理员专用 iOS APP。后端合同是官方 Sub2API
`v0.2.13`（tag `3040209f205472038c1ba745a1bedd2edd9053b1`）。生产服务器
保持原版；本说明不授权修改服务器或部署私有分支。

## 官方认证合同

官方 `AdminAuthMiddleware` 支持两种服务端认证方式：

1. `x-api-key: <admin-api-key>`；
2. `Authorization: Bearer <jwt>`，且 JWT 用户必须是管理员。

Vexlune Hub 产品选择第一种作为唯一产品登录方式。邮箱密码、注册、TOTP 和
JWT 兼容代码不是 APP 登录入口。

验证请求：

```text
GET /api/v1/admin/settings/admin-api-key
x-api-key: admin-<64hex>
Accept: application/json
```

官方成功响应为 envelope 中的状态数据，例如：

```json
{
  "code": 0,
  "data": {
    "exists": true,
    "masked_key": "admin-••••1234"
  }
}
```

`GET`、`POST /api/v1/admin/settings/admin-api-key/regenerate` 和
`DELETE /api/v1/admin/settings/admin-api-key` 都属于 admin 路由，均受
`AdminAuthMiddleware`、审计和相应合规/step-up 规则保护。重新生成接口只在生成
时返回完整 key；APP 不把它写入日志或普通存储。

## APP 行为

- 首屏只收集 Admin Key；空值不发请求。
- 首次验证只使用 `x-api-key`，不同时发送 Bearer。
- 成功后保存到 iOS SecureStore/Keychain，并使用
  `WHEN_UNLOCKED_THIS_DEVICE_ONLY`。key 不进入 AsyncStorage、Query cache、URL、
  JSON body、剪贴板、截图、分析事件或崩溃报告。
- 每个 admin 请求都走同一 HTTPS Hub origin。退出只删除本机 key、内存状态和
  Query cache；官方 API 没有 Admin-Key-specific logout。
- 冷启动从 SecureStore 恢复 key；不会调用 `/api/v1/auth/me`，不会刷新 JWT。

## 错误处理

| HTTP/reason | 含义 | APP 处理 |
|---|---|---|
| `401 UNAUTHORIZED` / `INVALID_ADMIN_KEY` | 缺少、错误或已撤销的 key | 清除本地 key，回到 Admin Key 页面；不重试旧 key。 |
| `403 FORBIDDEN` | 操作/资源权限、step-up 或路由策略拒绝 | 保留会话，展示服务端原因；不显示成功、不自动换 key。 |
| `423 ADMIN_COMPLIANCE_ACK_REQUIRED` | 服务端要求先完成管理员合规确认 | 展示官方文档并要求管理员显式勾选确认，再调用官方 `/admin/compliance/accept`；不自动接受、不删除 guard。 |
| `429` | 面板或接口限流 | 读取请求尊重 `Retry-After` 并有界重试；写请求查询结果后再决定。 |
| `5xx` / `cf-mitigated: challenge` / HTML | 上游或 Cloudflare challenge | 识别为错误/挑战；不把 HTML 当 JSON，不绕过人机验证。 |

## 排障记录格式

可以记录：时间、脱敏 request ID、HTTP 状态、稳定 `reason`、路径模板和耗时。不得
记录：完整 Admin Key、密码、JWT、cookie、Turnstile token、Cloudflare secret、
源站凭据、完整邮箱或响应正文。

建议按以下顺序排查：

1. 确认请求 URL 是 HTTPS Hub origin，header 名为 `x-api-key`，且没有同时带
   `Authorization`。
2. 用官方管理后台确认 key 尚未删除/重新生成，并确认服务器已配置首个管理员。
3. 查看状态和稳定 reason：401 看 key 生命周期，403 看资源/step-up，423 看合规
   接受，429 看限流与 `Retry-After`。
4. 只读验证成功后再执行任何写操作；写操作超时先查询服务端结果，避免重复扣款、
   重复充值或重复修改。
5. 不要部署私有 `/mobile/captcha/*`、nonce 或 health endpoint 来修复 Admin Key。

## 生产边界

以下操作不属于本地文档/代码工作，必须单独批准并制定回滚：生产服务重启、服务器
文件/数据库迁移、Admin Key 重新生成或删除、Cloudflare 规则/secret 变更、清除设备
数据。当前工作未执行这些操作。
