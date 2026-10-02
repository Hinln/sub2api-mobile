# Vexlune Hub QA 报告

检查日期：2026-10-03（Asia/Shanghai）。

## 自动化证据

| 检查 | 结果 | 说明 |
|---|---|---|
| TypeScript | 通过 | `pnpm exec tsc --noEmit` |
| Vitest | 通过（39/39） | `pnpm exec vitest run`，覆盖 Bearer、刷新、Cloudflare HTML、SecureStore、认证角色、TOTP challenge、支付 URL/幂等、用户安全和真实服务契约 |
| ESLint | 通过 | `pnpm exec expo lint`；0 error、0 warning |
| Web export | 通过 | `pnpm exec expo export --platform web`；仅用于静态路由/类型烟测，不用于原生发布构建 |
| Expo Doctor | 18/18（临时 npm shim） | `pnpm dlx expo-doctor@1.20.4`；主机直接运行 15/18，差异仅为缺少 npm；仅作依赖审计 |
| iOS prebuild | 通过 | 隔离目录生成 `VexluneMobileConsole.xcodeproj` |
| iOS Simulator Release | 通过 | Xcode 26.6；arm64/x86_64 `.app` |
| iPhoneOS Release unsigned | 通过 | arm64 `.app` 已打包并验证 IPA 完整性；未签名不能安装真机 |
| iOS Simulator Release | 通过 | Xcode 26.6 生成 `build/ios-final/Build/Products/Release-iphonesimulator/VexluneMobileConsole.app`；arm64/x86_64，Bundle ID `com.vexlune.mobile`，版本 `1.0.1 (2)` |
| iOS signed archive | 外部门槛 | Team/证书已识别，但本机 `codesign` 在登录钥匙串授权阶段停滞；需在 Xcode Signing & Capabilities 中完成一次授权后重试 archive/export |
| GitHub native iOS workflow | 环境阻塞 | run `37051524996` 在步骤前因 billing issue 失败（steps=0），未产生 IPA/.app artifact |
| Android | 暂缓 | 按当前范围不开发 Android；恢复范围时再配置 Android SDK/Java/签名并补充 APK/AAB 证据 |
| Go 后端测试 | 基线通过，最终增量待受控环境重跑 | Go 1.27.1 `GOPROXY=https://goproxy.cn,direct go test ./...` 的全仓库基线记录通过；本机当前未安装 Go，后端最终幂等增量需在 CI 或 Go 1.27.1 受控环境复核 |

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
