# 项目审计（管理员专用产品）

更新日期：2026-10-05（Asia/Shanghai）。

## 基线与仓库边界

- 移动端仓库：`Hinln/sub2api-mobile`，当前开发分支为
  `codex/vexlune-hub`。
- 官方后端合同：`Wei-Shaw/sub2api` 的 `v0.2.13` tag，commit
  `3040209f205472038c1ba745a1bedd2edd9053b1`。
- `Hinln/sub2api` 与本地 hardening 分支只用于审计；生产保持官方
  `v0.2.13`。本轮没有修改生产服务器、数据库、Cloudflare 规则/secret 或服务
  进程。
- 用户原有未提交的 `ios/VexluneMobileConsole/Info.plist` 修改必须保留，不能
  覆盖或代提交。

## 产品定位审计结论

Vexlune Hub 已从面向普通用户的客户端切换为管理员专用控制台。登录首屏只接受
官方 Sub2API Admin Key；不提供邮箱密码登录、注册、找回密码、TOTP 登录、普通
用户工作台、个人 API Key、用户用量、用户账单或终端公告入口。管理员仍可通过
官方 `/api/v1/admin/*` 路由管理用户、上游账号、分组、日志、设置和支付运营。

## 关键实现核对

1. **认证合同**：官方 AdminAuth 接受 `x-api-key: <admin-api-key>`，并在
   `GET /api/v1/admin/settings/admin-api-key` 返回状态；完整 key 不通过该状态
   接口返回。官方 JWT 是另一路兼容能力，产品不向管理员展示 JWT 登录。
2. **凭据边界**：`src/auth/session.ts` 使用 SecureStore/Keychain，设置
   `WHEN_UNLOCKED_THIS_DEVICE_ONLY`；Admin Key 不写入 AsyncStorage、URL、日志或
   Query cache。
3. **权限错误**：`401 INVALID_ADMIN_KEY` 清除本地 key；`403 FORBIDDEN` 保留
   会话并展示服务端拒绝；`423 ADMIN_COMPLIANCE_ACK_REQUIRED` 要求在官方后台
   完成合规确认，APP 不绕过；`429` 尊重服务端限流。
4. **请求边界**：`src/lib/admin-fetch.ts` 统一发送 `x-api-key`，删除继承的
   Bearer header，解析官方响应 envelope，保留脱敏 request ID，并拒绝 HTML/
   Cloudflare challenge 被当作成功。
5. **退出**：官方 `v0.2.13` 没有 Admin-Key-specific logout；本地退出删除
   SecureStore key、内存会话和 Query cache。官方后台重新生成/删除 key 后，旧
   key 的下一次请求应收到 401。
6. **构建**：iOS 使用仓库内 Xcode workspace、CocoaPods 和 `xcodebuild`；不使用
   Expo/EAS 云构建。Android 暂缓。

## 历史问题与处理

- 原项目包含邮箱密码、注册和用户页面；这些内容不再属于产品入口，后续修改不得
  把它们重新接回登录导航。
- 原有文档把 Bearer JWT 描述为移动端主认证，与当前 Admin Key 产品合同冲突；本
  审计同步修订 `docs/mobile/*` 与 `docs/admin-key/README.md`。
- 生产 `/mobile/turnstile` 专用页仍有历史部署证据缺口；它与 Admin Key 合同无关，
  不能被用来声称管理员登录已通过，也不能以部署私有 bridge 方式修复。

## 待验证项

- 在批准的可撤销环境和实体 iPhone 上完成真实 Admin Key 成功只读请求。
- 记录失效 key 的 401、合规 423、权限 403、429 限流和退出/冷启动证据；日志只保留
  状态、reason 和 request ID，不保留 key。
- TestFlight 上传、处理和生产发布仍是外部操作；任何服务器、Cloudflare、数据库或
  secret 变更都需要单独批准并提供回滚步骤。
