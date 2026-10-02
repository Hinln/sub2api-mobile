# Vexlune Hub QA 报告

检查日期：2026-10-03（Asia/Shanghai）。

## 自动化证据

| 检查 | 结果 | 说明 |
|---|---|---|
| TypeScript | 待本轮最终代码合并后执行 | `pnpm exec tsc --noEmit` |
| Vitest | 待本轮最终代码合并后执行 | `pnpm exec vitest run`，覆盖 Bearer、刷新、Cloudflare HTML、SecureStore 和真实服务契约 |
| ESLint | 待本轮最终代码合并后执行 | `pnpm exec expo lint`；只允许既有 warning，不允许 error |
| Expo Web export | 待本轮最终代码合并后执行 | `pnpm run web:build` |
| iOS prebuild | 通过 | 隔离目录生成 `VexluneMobileConsole.xcodeproj` |
| iOS Xcode 编译 | 环境阻塞 | CocoaPods 未安装，Xcode 许可尚未接受；签名身份和 provisioning profile 均未发现；见 `docs/BUILD_BLOCKERS.md` |
| Go 后端测试 | 环境阻塞 | 当前机器没有 `go`/`gofmt`，需在 CI 或 Go 构建机执行 |

## 必测真实链路

发布前必须用 staging 账号和 staging Cloudflare 配置完成：

1. 邮箱密码登录，服务端 `/auth/me` 返回普通用户与管理员两种角色，并分别进入 `/user` 与 `/monitor`。
2. 注册首屏只填写邮箱、密码和确认密码；启用邮箱验证时进入验证码步骤。
3. 第一方 WebView Turnstile 只返回一次 token；错误 action、错误 origin、过期 token 和重复 token 必须被后端拒绝。
4. 普通用户读取 profile、API keys、usage、公告、订阅和支付订单；创建订单带唯一 `Idempotency-Key`，超时后查询同一键不会重复下单。
5. 管理员读取仪表盘、用户、余额、账号、分组、日志与设置；高风险写操作有服务端权限、审计和二次确认。
6. 401 自动刷新一次并重试原请求；刷新失败清空当前用户的 SecureStore 和 Query cache。
7. Cloudflare 返回 HTML challenge 时显示安全验证提示，不把 HTML 当作成功 JSON。

## 禁止通过项

- 任何页面出现 mock、静态伪造余额/用量、无接口的死按钮或“提交成功”假状态。
- APP 发送 `x-api-key`、保存管理员 API Key、包含 Turnstile secret 或绕过 Cloudflare challenge。
- 生产环境直接执行余额、退款、删 key 等破坏性测试；此类测试必须使用隔离 staging 数据。
