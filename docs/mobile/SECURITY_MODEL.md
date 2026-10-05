# Vexlune Hub 安全模型（管理员专用）

更新日期：2026-10-06（Asia/Shanghai）。

本文以官方 Sub2API `v0.2.13`（tag commit
`3040209f205472038c1ba745a1bedd2edd9053b1`）为唯一 API 合同。生产后端、
数据库、Cloudflare 规则和密钥在本轮均未修改。

## 产品身份与信任边界

Vexlune Hub 是管理员控制台。普通用户不能从 APP 登录、注册或进入用户
工作台。APP 只调用官方 `/api/v1/admin/*`，服务端的 AdminAuth、审计、限流、
合规和二次验证才是权限边界；本地路由、隐藏按钮和 `workspaceMode` 都不能
授予权限。

| 边界 | 允许内容 | 明确禁止 |
|---|---|---|
| APP → Sub2API Admin API | HTTPS；`x-api-key: <Admin Key>`；官方 JSON 请求和响应 | `Authorization` 与 Admin Key 混发、把 key 放入 URL/body、直连数据库/Redis/SSH/Docker、发送源站密码 |
| 本机凭据存储 | iOS SecureStore/Keychain，`WHEN_UNLOCKED_THIS_DEVICE_ONLY`；仅当本地模拟器包明确缺少 Keychain entitlement 时，允许已验证 key 留在进程内存 | AsyncStorage、Query cache、剪贴板、日志、截图、分析事件、崩溃报告或任何普通持久化文件 |
| 服务端 AdminAuth | 官方 `x-api-key` 常量时间比较、管理员身份映射、审计和路由策略 | 客户端伪造管理员角色、接受本地“成功”、绕过 401/403/423 |
| APP → Cloudflare | 正常 HTTPS 请求；挑战时显示可恢复错误 | 发送 `cf_clearance`、伪造浏览器头、自动解题、把 challenge HTML 当 JSON 成功 |

## Admin Key 生命周期

1. 首屏读取用户输入，只在内存中 trim；空值不发送请求。
2. `GET /api/v1/admin/settings/admin-api-key` 用一个 `x-api-key` 请求验证。
   只有官方返回 `code: 0` 且 `data.exists === true` 时才写入 SecureStore。
3. 后续 admin 请求统一通过同一 header；请求构造器删除继承的
   `Authorization`，确保认证方式无歧义。
4. 冷启动只从 SecureStore 恢复 key。APP 不请求 `/api/v1/auth/me`，不创建或
   刷新 JWT，也不把 key 复制到普通存储。
5. 本地退出删除 SecureStore key、会话内存和 Query cache。官方 `v0.2.13`
   没有 Admin-Key-specific logout API，因此不能声称服务端已撤销 key。
6. 官方后台重新生成或删除 key 后，下一次 admin 请求会返回 401；客户端清除
   本地 key 并回到登录页。

本地未签名/adhoc 模拟器包可能在 SecureStore 写入时返回
`errSecMissingEntitlement`。此时 APP 不把 key 写入普通存储，而是保留已验证
的 key 直到进程退出，并在 `adminApiKeyStorage` 标记为 `memory`；正式设备包仍
必须使用带 Keychain entitlement 的签名构建，冷启动不会恢复这类内存会话。

## 错误与权限边界

- **401**：`UNAUTHORIZED`、`INVALID_ADMIN_KEY` 等认证失败。APP 清理本地
  key，停止请求并显示重新输入提示。Admin Key 没有 refresh 语义。
- **403**：`FORBIDDEN` 或操作级权限/step-up 失败。APP 保留会话、展示服务端
  错误，不得把它改写为成功或自动更换凭据。官方 Admin Key 通常映射首个管理
  员，因此 403 也可能来自资源级或操作级政策。
- **423**：`ADMIN_COMPLIANCE_ACK_REQUIRED`。说明服务端要求管理员先在官方
  合规页面完成确认；APP 不伪造 phrase、不自动接受、不关闭 guard。
- **429**：限流。仅对安全读请求使用有界重试并尊重 `Retry-After`；写操作不盲重试。
- **5xx/Cloudflare HTML**：显示可恢复的网络/挑战错误。任何非 JSON 的 2xx
  body 都不能当作成功。

## 写操作、审计和日志

- 余额、退款、订单、用户/账号状态、分组、公告、设置和密钥管理等写操作由
  服务端校验、审计、幂等和 step-up 规则决定。APP 不自行计算余额、费用或权限。
- 只有官方 `v0.2.13` 明确提供的幂等接口才可自动重试。写请求超时且没有 replay
  合同时先查询服务端结果，再让管理员决定是否重试。
- 日志仅可保留脱敏 request ID、状态、稳定 reason、耗时和必要资源 ID；不得写入
  完整 Admin Key、密码、JWT、cookie、challenge token、上游凭据或响应正文。

## Cloudflare 与生产限制

- Admin Key 验证不增加 private captcha/nonce/health API，也不改变官方
  `/api/v1/settings/public` 或认证路由。生产 `/mobile/turnstile` 的历史部署
  问题不能作为 Admin Key 成功证据。
- 不修改生产服务器文件、数据库迁移、Cloudflare 规则/secret 或服务进程。任何
  需要发布的操作必须先得到明确批准，并记录回滚步骤。

## 验证证据与未完成项

已具备本地源码证据：`x-api-key` header、SecureStore 边界、401 清除、423/403
错误映射和无明文 key 的 Admin Key 测试。仍需在批准的 iOS 设备和可撤销环境完成：

- 一个真实 key 的成功只读请求（仅记录状态/reason/request ID）；
- 失效 key 的 401 清理、合规 423 和权限 403 的设备展示；
- 冷启动 SecureStore 恢复、退出、重生成 key 后重新登录；
- TestFlight/实体 iPhone 流程。Android 仍暂缓。
