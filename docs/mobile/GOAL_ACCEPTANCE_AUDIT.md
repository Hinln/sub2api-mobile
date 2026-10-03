# Goal 0–8 验收审计

审计日期：2026-10-03（Asia/Shanghai）。本表按
`prompts/08_Codex目标模式分阶段执行提示词.md` 和 `prompts/09` 的验收条件维护。
“源代码完成”只代表当前 checkout 的代码、文档和自动化检查已证明；它不代替
真实 staging、Cloudflare、支付 provider、TestFlight 或实体设备证据。

## 目标证据

| Goal | 必须证明的结果 | 当前证据 | 状态 |
|---|---|---|---|
| 0 | 两个目标仓库有可回退分支、依赖/构建基线及已记录失败 | `Hinln/sub2api-mobile` 分支 `codex/vexlune-hub`（PR #1 当前 head）；`Hinln/sub2api` 分支 `codex/backend-hardening-pr`，HEAD `91a1b7f36`；构建限制记录在 `QA_REPORT.md`/`BUILD_BLOCKERS.md` | 源码已完成 |
| 1 | 路由、DTO、权限、错误和缺口进入真实矩阵 | `API_COVERAGE_MATRIX.md`、`API_GAP_REPORT.md`、`CURRENT_ARCHITECTURE.md`，并注明私有仓库与 public reference 的边界 | 源码已完成 |
| 2 | 一个正式 V Logo、共享设计系统、会话/API/query 基础设施 | `src/components/vexlune-logo.tsx`、`src/theme.ts`、`src/lib/admin-fetch.ts`、SecureStore/query 清理测试 | 源码已完成 |
| 3 | 邮箱密码登录/注册、`/auth/me` 角色路由、refresh/logout、TOTP/Turnstile | `src/services/auth.ts`、`src/components/turnstile-gate.tsx`；Vitest 覆盖 401/refresh、TOTP、HTML challenge、nonce/origin/action 校验 | 源码完成；真实环境待验 |
| 4 | 普通用户工作台每个可见控件连接真实接口且写操作可重试 | `src/services/user.ts` 与 `app/user*.tsx`；API key、usage、公告、订阅和订单测试/幂等测试 | 源码完成；支付 sandbox 待验 |
| 5 | 管理员工作台、渐进披露和高风险操作的权限/审计/幂等 | `src/services/admin*.ts`、管理员路由、后端 AdminAuth/audit/step-up；管理员服务测试 | 源码完成；管理员 staging 待验 |
| 6 | 后端缺口以 service/迁移/权限/审计/测试方式补齐 | backend `91a1b7f36`：Turnstile nonce/bridge/CSP 与支付幂等协调器；`go test -p 1 ./...` 通过 | 源码完成；部署待验 |
| 7 | 逐行真实联调、无占位扫描、安全和错误路径证据 | `QA_REPORT.md`、`SECURITY_MODEL.md`、`scripts/verify-mobile-origin.sh`、Vitest 47/47；线上 bridge 当前被 SPA 路由截获 | 本地完成；staging 阻塞 |
| 8 | 可安装 iOS/Android 构建、CI、发布和回滚资料 | iOS 原生 archive/IPA 已签名且 codesign 通过；发布/回滚/ASC 清单已建立；Android 暂缓 | iOS 本地完成；发布外部门槛待验 |

## 已执行的本地检查

在移动端仓库执行：

```text
pnpm exec tsc --noEmit
pnpm exec vitest run                 # 47/47
pnpm exec expo lint                  # 0 error / 0 warning
pnpm exec expo export --platform web
sh scripts/verify-production-scan.sh
```

在后端仓库使用 Go 1.27.1 隔离工具链执行：

```text
GOPROXY=https://goproxy.cn,direct GOTOOLCHAIN=local go test -p 1 ./...
```

上述检查证明源码和本地构建边界；没有把线上 JSON、TestFlight、支付 provider
或实体设备结果冒充本地测试结果。

## 完成前必须补齐的外部证据

1. 部署 backend `91a1b7f36`、执行迁移并将 `/mobile/captcha/turnstile` 从线上
   SPA 路由切换到第一方 bridge；保存脱敏 Cloudflare 规则和 `verify-mobile-origin.sh`
   的通过输出。
2. 使用可撤销的普通用户/管理员 staging 账号验证角色、Turnstile 一次性消费、
   401 refresh、管理员 step-up/audit、支付订单幂等和 logout；完成后撤销账号。
3. 上传已验证的 `VexluneMobileConsole.ipa` 到 App Store Connect，记录 build ID、
   处理状态、TestFlight 真机流程和审核资料。Android 只有在产品范围恢复时才
   继续 APK/AAB 证据。

在上述证据存在前，项目不能将 Goal 7/8 或总目标标记为“已完成”。

