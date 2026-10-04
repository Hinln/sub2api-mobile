# Vexlune Hub QA 报告

检查日期：2026-10-04（Asia/Shanghai）。

## 版本与环境边界

- API 合同基线是官方 Sub2API `v0.2.13`（tag commit
  `3040209f205472038c1ba745a1bedd2edd9053b1`）。本轮没有修改或部署
  `Hinln/sub2api`，没有执行生产迁移、生产写操作或 Cloudflare 配置变更。
- 官方 `v0.2.13` 没有 `/mobile/captcha/*` 私有路由。认证验证码必须使用
  `/api/v1/settings/public` 返回的公开 provider 配置和官方 widget/SDK，提交
  `turnstile_token` 或 Tencent/Aliyun 的官方字段；`turnstile_nonce` 和私有
  backend bridge 不属于发布验收，`/mobile/turnstile` 页面及其 tuple 仅作为
  客户端 token transport 验收。
- 首版只验收原生 iOS。Android 暂缓，不要求 APK/AAB、Android SDK 或 Android
  签名证据。

## 自动化证据

| 检查 | 结果 | 说明 |
|---|---|---|
| TypeScript | 通过 | `pnpm exec tsc --noEmit` |
| Vitest | 通过（54/54） | `pnpm exec vitest run`，覆盖 Bearer、刷新、Cloudflare HTML、SecureStore、认证角色、TOTP、支付/用户服务契约、规范化 Hub origin 和 `/mobile/turnstile` 专用页 WebView token bridge。测试不证明生产可用性。 |
| 生产路径占位扫描 | 通过 | `pnpm run verify:production-scan`；扫描 `app/` 与 `src/`，拒绝 mock/fixture/fake/sample、伪请求定时器、嵌入式 secret 和空 `onPress`。 |
| ESLint | 通过 | `pnpm exec expo lint`；0 error、0 warning。 |
| Web export | 通过 | `pnpm exec expo export --platform web`；只作静态路由/类型烟测，不是原生发布构建。 |
| 官方 v0.2.13 合同审计 | 通过（源码审计） | 已核对 `/api/v1/settings/public`、认证 provider proof 字段、Bearer/2FA 路由；官方 tag 不含 `/mobile/captcha/*`。 |
| Go 后端测试 | 未运行 | 当前开发机没有 Go 工具链；本轮未修改或部署后端，不能把私有 checkout 的测试结果当作官方 v0.2.13 证据。 |
| iOS Simulator Release | 通过 | 使用仓库内已提交的 `ios/VexluneMobileConsole.xcworkspace` 和 Xcode 26.6 `xcodebuild` 生成 arm64/x86_64 `.app`；没有 Expo/EAS 云构建。 |
| iPhoneOS Release unsigned | 通过 | 使用原生 Xcode 工具链生成 arm64 archive/app；未签名包不能安装真机。 |
| iOS signed archive/IPA | 通过（当前提交） | 提交 `23e83c1af0412e82c7d0cfb68ebac542fdd21505` 已完成 archive/export，IPA SHA-256 为 `27d8f9bbfdc2aa9883d15307ee6ab7326e55212fcf5ca24c5610865638385570`，解包 App 通过 `codesign --verify --deep --strict`。TestFlight 处理、实体 iPhone 和线上 API 验收仍未完成。 |
| Production API / private bridge probe | 只读探测未通过专用页检查 | `scripts/verify-mobile-origin.sh` 确认公开设置为 JSON 且 Turnstile 已启用，也确认未暴露 Secret；线上 `/mobile/turnstile` 返回旧 SPA 壳，入口 bundle 不含 `MobileTurnstile`，所以不能视为已部署。没有调用生产 `/mobile/captcha/*`，没有部署私有 backend bridge。 |
| Turnstile token refresh lifecycle | 通过（源码修复 + 自动化检查） | 本地 240 秒刷新现在会重建专用 WebView 文档并生成新 tuple；原生消息来源同时校验同源 `/mobile/turnstile` 路径，避免 hash-only 导航或同源其他页面导致陈旧/伪造消息。 |
| Android | 暂缓 | 当前范围不开发、不构建、不签名 Android；恢复范围后另行补齐证据。 |

## 必测非生产链路

在批准的非生产环境和可撤销测试账号上完成：

1. 读取 `/api/v1/settings/public`，按服务端启用的 provider 显示官方验证码控件；
   提交一次性 provider token，不生成或传输私有 nonce。
2. 邮箱密码登录、注册、密码找回和 TOTP；`/auth/me` 返回普通用户与管理员
   时分别进入对应工作台。
3. 401 只触发一次 refresh；刷新失败清空 SecureStore 和 Query cache。
4. 普通用户读取 profile、API keys、usage、公告、订阅和订单。超时写操作先
   查询服务端结果；只有官方 v0.2.13 明确提供的幂等语义才能用于自动重试。
5. 管理员读取仪表盘、用户、余额、账号、分组、日志与设置；权限、审计和二次
   确认以服务端返回为准。
6. Cloudflare 返回 HTML challenge 时显示安全验证/重试提示，不把 HTML 当作成功
   JSON；不修改生产 WAF 规则来绕过该边界。

## 禁止通过项

- 把私有 `GET /mobile/captcha/turnstile`、health probe、nonce 或 bridge 当作
  官方 v0.2.13 能力，或以其测试结果替代真实合同证据。
- 修改生产后端、迁移、经营设置、Cloudflare 路由，或在真实用户上执行加款、退款、
  删除密钥和主动模型探测。
- APP 发送 `x-api-key`、保存管理员 API key、包含 captcha secret、伪造 provider
  token 或绕过 Cloudflare challenge。
- 把 Android 构建、签名或真机验收列为本次发布的必需条件。
