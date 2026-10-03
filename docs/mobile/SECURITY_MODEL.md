# Vexlune Hub 安全模型

更新日期：2026-10-03（Asia/Shanghai）。

本文记录 Vexlune Hub 手机端与私有 `Hinln/sub2api` 服务端之间的信任边界、
会话生命周期和可验证的安全约束。它是实现和发布检查的依据，不包含任何生产
密钥、用户凭据、Cloudflare secret、签名私钥或 provisioning profile。

## 信任边界

| 边界 | 允许内容 | 明确禁止 |
|---|---|---|
| APP → `hub.vexlune.com` | HTTPS JSON API、Bearer access token、一次性 Turnstile proof | 数据库/Redis/SSH/Docker 直连、源站 IP、管理员 API key、Cloudflare secret |
| APP → 第一方 Turnstile WebView | `https://hub.vexlune.com/mobile/captcha/turnstile` 与 Cloudflare widget 资源 | 任意外部导航、任意 JavaScript bridge 消息、把验证页当作通用浏览器 |
| 服务端 → Cloudflare | 服务端保存的 secret、受校验的 action/hostname、一次性 nonce | 将 secret 序列化到公开 settings、APP bundle、URL 或日志 |
| 管理员工作台 | 服务端签发的 admin JWT、服务端 AdminAuth/审计/step-up | 以本地 role、隐藏路由或 UI 确认代替服务端授权 |

移动端只连接管理站点 `hub.vexlune.com`。`api.vexlune.com` 仅作为后端提供的
OpenAI 兼容接入信息展示，不能被移动端 API client 当作管理 API base URL。

## 会话与凭据

1. 登录或注册后，APP 立即调用 `/api/v1/auth/me`，以服务端返回的 role 作为
   工作台和权限的唯一来源。
2. access/refresh token 仅写入 Expo SecureStore；不写入 AsyncStorage、URL、
   Query cache、日志、崩溃报告或剪贴板。
3. access token 收到 401 时只允许一个刷新请求在飞，并只重试原请求一次。
   refresh 失败时同时清除 SecureStore、当前用户状态和 Query cache。
4. 退出调用 `/api/v1/auth/logout`；即使网络调用失败，也必须清理本地会话。
   “退出全部设备”使用服务端 `/api/v1/auth/revoke-all-sessions`，不能只改本地
   role。
5. 生物识别仅解锁本机保存的会话，不替代服务端 JWT、TOTP、step-up 或
   AdminAuth。切换账号前先清除前一账号的 query key 和页面状态。

## Turnstile 与 Cloudflare

- 登录、注册、发送验证码和密码找回按服务端公开设置决定是否需要 Turnstile。
- WebView 只接受结构化 `type`、`action`、`nonce`、`origin` 和单个 token，且
  native 侧验证实际页面 URL、第一方 origin 和 action。后端 Redis nonce 为短期、
  一次性消费；错误 action、origin、过期或重放必须 fail closed。
- 后端再次向 Cloudflare Siteverify 校验 token，并绑定 hostname/action。APP 不
  接收或推导 secret，也不发送 `cf_clearance`、伪造浏览器 header 或自动解题。
- API client 在 JSON 解析前识别 `cf-mitigated: challenge` 和异常 HTML，显示
  可恢复的验证/配置错误；不能把挑战 HTML 当成成功响应。
- Cloudflare 规则只允许精确 host/path 的 API challenge 例外，保留 WAF、TLS、
  DDoS、bot signals、限流和应用层认证。具体规则见
  `CLOUDFLARE_MOBILE_API_RULES.md`。

## 权限、审计与写操作

- 普通用户深链进入管理员页面时由客户端拦截；任何绕过客户端的请求仍必须由
  后端 AdminAuth 返回 403。
- 余额、退款、支付订单、用户/账号状态、分组和公告等写操作使用服务端权限、
  输入校验、审计和适用的 step-up/TOTP。移动端必须显示服务端错误，不得显示
  预先写死的成功状态。
- 支付和其他可重试写操作带稳定的 `Idempotency-Key`。服务端以请求指纹拒绝
  同键不同 payload，并在安全时重放原结果；APP 不自行计算余额、费用或倍率。
- 日志与错误详情默认只显示排障所需元数据，脱敏 request ID、模型、耗时和
  费用；不显示密码、完整 API key、token、上游 cookie、prompt、代码或响应正文。

## 验证证据与当前限制

移动端 SecureStore、Bearer/refresh 单飞、Cloudflare HTML 边界、Turnstile
消息校验、权限和支付幂等均有 Vitest 覆盖；后端 nonce、action/hostname、审计
和幂等协调器有 Go 测试。源码证据不等同于部署证据，以下外部门槛仍需在真实
staging/设备上验证：

- `hub.vexlune.com/mobile/captcha/turnstile` 已由目标 backend 提供最小 bridge，
  但线上当前仍返回 SPA shell，需部署 backend `933e91ccb` 并核对 Cloudflare
  路由。
- 需要可撤销的普通用户与管理员 staging 账号完成 role、TOTP、审计和支付幂等
  联调。
- iOS IPA 已本机签名并通过 codesign；TestFlight 上传、处理和实体 iPhone 流程
  尚未形成证据。Android 按当前产品范围暂缓。

