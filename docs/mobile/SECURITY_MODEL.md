# Vexlune Hub 安全模型

更新日期：2026-10-04（Asia/Shanghai）。

本文以官方 Sub2API `v0.2.13`（tag commit
`3040209f205472038c1ba745a1bedd2edd9053b1`）为 API 合同。生产后端和
Cloudflare 配置在本轮保持不变；本文不授权部署私有扩展。

## 信任边界

| 边界 | 允许内容 | 明确禁止 |
|---|---|---|
| APP → 管理 API | HTTPS `/api/v1/*`、Bearer access/refresh token、provider captcha proof | 数据库/Redis/SSH/Docker 直连、源站 IP、管理员 API key、captcha secret |
| APP → 官方验证码控件/网页 | 官方 provider 资源和一次性 provider token | 私有 `/mobile/captcha/*`、任意 JavaScript bridge、nonce 或共享绕过密钥 |
| 服务端 → captcha provider | 服务端保存的 secret 和官方 v0.2.13 校验请求 | 将 secret 序列化到公开 settings、APP bundle、URL 或日志 |
| 管理员工作台 | 服务端签发的 admin JWT、服务端 AdminAuth/审计/step-up | 以本地 role、隐藏路由或 UI 确认代替服务端授权 |

## 会话与凭据

1. 登录或注册后，APP 立即调用 `/api/v1/auth/me`，以服务端返回的 role 作为
   工作台和权限的唯一来源。
2. access/refresh token 仅写入 SecureStore；不写入 AsyncStorage、URL、Query
   cache、日志、崩溃报告或剪贴板。
3. access token 收到 401 时只允许一个刷新请求在飞，并只重试原请求一次。
   refresh 失败时同时清除 SecureStore、当前用户状态和 Query cache。
4. 退出调用 `/api/v1/auth/logout`；即使网络调用失败，也必须清理本地会话。
   “退出全部设备”使用服务端接口，不能只改本地 role。
5. 生物识别仅解锁本机保存的会话，不替代服务端 JWT、TOTP、step-up 或
   AdminAuth。切换账号前先清除前一账号的 query key 和页面状态。

## Captcha 与 Cloudflare

- `/api/v1/settings/public` 决定是否启用 Turnstile、Tencent 或 Aliyun，并只
  返回公开 site/app ID。
- 客户端使用官方 provider widget/SDK 或官方 web auth surface，按 v0.2.13
  提交 `turnstile_token`，或 Tencent `tencent_captcha_ticket` /
  `tencent_captcha_randstr` 等官方字段。不存在官方 `turnstile_nonce` 或
  mobile bridge 合同。
- API client 在 JSON 解析前识别 `cf-mitigated: challenge` 和异常 HTML，显示
  可恢复的验证/配置错误；不能把挑战 HTML 当成成功响应，也不能发送
  `cf_clearance`、伪造浏览器 header 或自动解题。
- 生产 WAF、TLS、DDoS、bot signals、限流和应用层认证保持原样。客户端错误边界
  不应通过新增 Cloudflare 规则来绕过挑战。

## 权限、审计与写操作

- 普通用户深链进入管理员页面时由客户端拦截；任何绕过客户端的请求仍必须由
  后端 AdminAuth 返回 403。
- 余额、退款、支付订单、用户/账号状态、分组和公告等写操作使用服务端权限、
  输入校验、审计和适用的 step-up/TOTP。移动端必须显示服务端错误，不得显示
  预先写死的成功状态。
- 只有官方 v0.2.13 明确提供的幂等语义才能自动重试。若写请求超时且没有服务端
  replay 契约，先查询资源结果再决定是否重试；APP 不自行计算余额、费用或倍率。
- 日志与错误详情默认只显示排障所需元数据，脱敏 request ID、模型、耗时和费用；
  不显示密码、完整 API key、token、上游 cookie、prompt、代码或响应正文。

## 验证证据与当前限制

SecureStore、Bearer/refresh 单飞、Cloudflare HTML 边界和权限测试属于本地源码
证据；历史 private bridge/nonce 测试不代表官方合同。以下外部门槛仍需在批准的
非生产环境和设备上验证：

- provider captcha proof 能在官方 v0.2.13 auth 路由中成功消费，过期/无效 proof
  被拒绝；
- 可撤销普通用户与管理员账号完成 role、TOTP、审计和支付结果联调；
- iOS IPA 已本机签名并通过 codesign；TestFlight 上传、处理和实体 iPhone 流程
  形成可审计记录；
- Android 按当前产品范围暂缓。
