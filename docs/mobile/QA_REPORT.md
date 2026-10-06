# Vexlune Hub QA 报告（管理员专用）

检查日期：2026-10-06（Asia/Shanghai）。

## 产品与环境边界

- APP 首屏只接受官方 Sub2API Admin Key；普通用户登录、注册、找回密码、TOTP
  登录、个人 API Key、个人用量和用户支付不属于本版本。
- API 合同是官方 Sub2API `v0.2.13` tag
  (`3040209f205472038c1ba745a1bedd2edd9053b1`)。本轮没有修改/部署
  `Hinln/sub2api`，没有生产迁移、服务重启、Cloudflare 规则或 secret 变更。
- iOS 是本轮唯一发布平台；Android 暂缓。Xcode workspace/CocoaPods/`xcodebuild`
  为构建路径，不使用 Expo/EAS 云构建。

## Admin Key 验收链路

| 阶段 | 预期证据 | 当前状态 |
|---|---|---|
| 输入 | 空值不发请求；完整 key 只在内存中 trim | 源码已实现；需设备操作记录 |
| 验证 | `GET /api/v1/admin/settings/admin-api-key`，仅 `x-api-key` header | 源码与 `tests/admin-auth.test.ts` 覆盖；首次 Cloudflare/HTTP2 边缘请求允许单次 60 秒预算；真实 Hub Key 联调仍待批准环境执行 |
| 成功 | `code: 0` 且 `data.exists === true` 后才写 SecureStore | 源码已实现；未把 key 写入日志/URL/body |
| 401 | `INVALID_ADMIN_KEY` 清理本地 key，停留在 key 页 | 源码/测试覆盖；需设备确认 UI |
| 403 | 服务端拒绝操作，保留会话并显示权限错误 | 错误映射已实现；需服务端策略场景验证 |
| 423 | `ADMIN_COMPLIANCE_ACK_REQUIRED`，显示官方文档并要求管理员显式勾选确认后再 POST 官方 accept | 源码已实现；需可复现的合规环境验证 |
| 429 | 尊重 `Retry-After`；只对安全读请求有界重试 | 请求层已实现；写请求不盲重试 |
| 退出 | 删除 SecureStore key、清空 query cache、返回 `/login` | 源码已实现；官方没有 Admin-Key-specific logout |
| 冷启动 | 只从 SecureStore 恢复 key，不请求 `/auth/me` 或刷新 JWT | 源码已实现；需实体 iPhone 记录 |

## 自动化与本地证据

| 检查 | 结果/限制 |
|---|---|
| Admin Key service tests | `tests/admin-auth.test.ts` 覆盖成功验证、只发 `x-api-key`、拒绝 key 不落盘；使用工作区 Node 运行通过。 |
| Admin fetch tests | `tests/admin-fetch.test.ts` 覆盖 header 覆盖、401/403、Cloudflare HTML、request ID、重试边界；通过。 |
| TypeScript/ESLint/Vitest | `pnpm typecheck`、`pnpm lint`、`pnpm test -- --run` 通过；13 个测试文件、72 项测试通过。 |
| 生产占位扫描 | `sh scripts/verify-production-scan.sh` 通过。 |
| Web build | `pnpm web:build` 通过；Playwright 视觉测试未启动，因为本机未安装 Chromium headless shell。 |
| iOS build | 原生 Xcode/CocoaPods simulator Release build 通过，未使用 Expo/EAS 云构建；最终产物为 `build/ios-admin-ops-round9/Build/Products/Release-iphonesimulator/VexluneMobileConsole.app`，已安装并启动。 |
| Production probe | 使用无效占位凭据验证：`x-api-key` 返回 `401 INVALID_ADMIN_KEY`，Bearer 形式返回 `401 INVALID_TOKEN`；只记录脱敏 request ID。使用用户授权的真实 Admin Key 完成只读登录、首页、Ops、用户、上游账号、分组、订单、设置及后台恢复 smoke test；没有提交破坏性写操作。 |
| 2026-10-06 official contract probe | `GET /api/v1/settings/public` 返回 JSON `200`、`code: 0`、`turnstile_enabled: true`，未发现 secret；无 header 请求 `GET /api/v1/admin/settings/admin-api-key` 返回 JSON `401 UNAUTHORIZED`。未发送 Admin Key。 |
| First-party mobile origin probe | `./scripts/verify-mobile-origin.sh` 于 2026-10-06 执行失败：入口 JS bundle 不包含 `MobileTurnstile`。这证明专用页尚未部署，不能声称 Turnstile 线上联调通过；未修改生产。 |
| Simulator timeout evidence | iPhone 17 Pro Max simulator 的同一路径通过 CFNetwork/HTTP2 在约 33.767 秒后返回 HTTP 200；APP 原 15 秒 AbortController 在响应前触发 `REQUEST_TIMEOUT`。验证请求现为单次 60 秒预算，并有慢响应回归测试。 |

## 必测 iOS 场景

### Admin Key identity evidence

The official v0.2.13 Admin Key validation response is limited to key status and
does not return the current administrator's username or email. After validation,
the app makes the documented active-admin list query (same ID-ascending
selection as the official middleware) to display a server-returned username or
email. If that read-only query fails, it keeps `管理员`; no identity is
inferred from the key and `/auth/me` is never called with it.

1. 输入一个可撤销的真实 Admin Key，验证一次只读 dashboard 请求成功；日志只留
   status/reason/request ID，绝不留 key。
2. 输入错误/已删除 key，确认 401 后 key 被清除，冷启动不会重进控制台。
3. 对可用环境触发 403 与 423，确认页面分别显示权限拒绝和官方合规提示，不能
   自动“确认”或伪造成功。
4. 在设置/官方后台重新生成 key，确认旧 key 401、新 key 可重新验证。
5. 退出后检查 SecureStore 与 Query cache 清理；重新启动只显示 Admin Key 页面。
6. 开启 Cloudflare challenge 时确认 HTML/challenge 不被当成 JSON 成功；APP 不发送
   `cf_clearance`、secret 或私有 captcha nonce。

## 禁止通过项

- 用邮箱密码、JWT、普通用户账号或旧的用户工作台证明管理员专用版本通过。
- 把 `403`/`423` 当作登录成功，或为了通过测试绕过 AdminAuth、合规 guard、Cloudflare。
- 修改生产服务器、数据库、Cloudflare 规则/secret 或清除设备数据后再声称本地修复。
- 将 Android、TestFlight 或未执行的线上联调写成已通过。

## 2026-10-06 管理员首页与监控回归

- 首页现在只保留“今日概览、快捷操作、服务状态”三个区块，今日概览为 2 行 × 4
  列八项卡片，且前两项固定为“充值实收”“余额消费”。
- 充值实收只读取官方 `/api/v1/admin/payment/dashboard`；余额消费只读取
  `today_actual_cost`，缺失显示 `--`，不补造数字或汇率。
- 首页移除趋势图和额外处理列表；监控页继续承载请求、Token、计费趋势与异常入口。
- 首页“服务状态”改为官方 Sub2API Ops 概览卡，调用
  `/api/v1/admin/ops/dashboard/overview?time_range=1h&mode=auto`，展示健康分、QPS/TPS、SLA、错误率、请求/TTFT P99、系统快照和后台任务；监控未启用、同步失败或字段缺失时分别显示对应状态或 `--`，不把版本接口响应伪装成在线。
- 本轮 Release 包已安装并启动；真实管理员运行截图为
  `build/ios-admin-ops-round9/screenshots/home-final.png` 与
  `build/ios-admin-ops-round9/screenshots/monitor-final.png`。页面显示真实
  `Emotion` 身份和官方 Sub2API Ops 指标，缺失字段显示 `--`。

## 2026-10-06 第四阶段全页面 QA

详细的页面、控件、真实接口和限制证据见
[`QA_INTERACTION_MATRIX.md`](./QA_INTERACTION_MATRIX.md)。本轮完成了 iPhone 17 Pro Max
Simulator 的真实 Admin Key smoke test；所有破坏性动作（取消、退款、删除、禁用、创建、
发布和告警处理）只检查到二次确认或表单边界，未提交请求。模拟器杀进程后的 Keychain
持久化仍需正式签名 TestFlight 真机验证。

## 第四阶段评审结论

Chrome 中的外部评审已确认：完成本轮真实 smoke test 后可进入 TestFlight 真机验证。当前代码已完成官方 Ops 状态展示、真实管理员身份降级查询、四项主导航和详情页自定义返回；TestFlight 上的正式签名 Keychain 持久化仍是发布前待验证项。
