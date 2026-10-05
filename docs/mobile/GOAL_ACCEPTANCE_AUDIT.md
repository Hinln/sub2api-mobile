# Goal 0–8 验收审计

审计日期：2026-10-05（Asia/Shanghai）。本表按
`prompts/08_Codex目标模式分阶段执行提示词.md` 和 `prompts/09` 的验收条件维护。
“源代码完成”只代表当前 checkout 的代码、文档和自动化检查已证明；它不代替
真实 staging、Cloudflare、支付 provider、TestFlight 或实体设备证据。

本轮 API 合同固定为官方 Sub2API `v0.2.13` tag（commit
`3040209f205472038c1ba745a1bedd2edd9053b1`）。生产未修改；官方版本没有
`/mobile/captcha/*` 私有 bridge。Android 按当前范围暂缓，原生 iOS 只走已提交
的 Xcode workspace。

## 目标证据

| Goal | 必须证明的结果 | 当前证据 | 状态 |
|---|---|---|---|
| 0 | 移动仓库有可回退分支、依赖/构建基线及已记录失败 | `Hinln/sub2api-mobile` 当前交付分支与本地构建记录；API 基线为官方 v0.2.13；构建限制记录在 `docs/mobile/QA_REPORT.md`/`docs/BUILD_BLOCKERS.md` | 源码已完成 |
| 1 | 路由、DTO、权限、错误和缺口进入真实矩阵 | `API_COVERAGE_MATRIX.md`、`API_GAP_REPORT.md`、`CURRENT_ARCHITECTURE.md`，并注明私有仓库与 public reference 的边界 | 源码已完成 |
| 2 | 一个正式 V Logo、共享设计系统、会话/API/query 基础设施 | `src/components/vexlune-logo.tsx`、`src/theme.ts`、`src/lib/admin-fetch.ts`、SecureStore/query 清理测试 | 源码已完成 |
| 3 | Admin Key 登录、SecureStore 持久化、管理员路由和失效处理 | `app/login.tsx`、`src/services/admin-auth.ts`、`src/auth/session.ts`、`src/lib/admin-fetch.ts`；仅发送 `x-api-key`，401/403/423/429 分支有测试 | 本地实现完成；真实可撤销 Key 联调待批准环境 |
| 4 | 管理员工作台每个可见控件连接官方管理接口且写操作具备幂等边界 | `src/services/admin.ts`、`src/services/admin-*.ts` 与管理员页面；用户、上游账号、分组、日志、公告、订单资金和设置均走 admin 路由 | 源码完成；官方非生产权限/审计场景待验 |
| 5 | 管理员工作台、渐进披露和高风险操作的权限/审计/幂等 | `src/services/admin*.ts`、管理员路由、后端 AdminAuth/audit/step-up；管理员服务测试 | 源码完成；管理员 staging 待验 |
| 6 | 官方后端合同与不支持项进入缺口报告 | `API_GAP_REPORT.md`、`API_COVERAGE_MATRIX.md`；没有后端迁移或 private bridge 部署 | 合同审计完成；不支持项保持阻塞 |
| 7 | 逐行管理员接口联调、无占位扫描、安全和错误路径证据 | `QA_REPORT.md`、`SECURITY_MODEL.md`、`scripts/verify-production-scan.sh`、Vitest 64/64；非生产账号待验 | 本地完成；非生产阻塞 |
| 8 | 可安装 iOS 构建、发布和回滚资料 | 当前 URI 代码已通过原生 archive/export，签名 IPA 为本地可重建产物；发布/回滚/ASC 清单已建立；Android 暂缓 | iOS 本地构建完成；TestFlight、实体设备和线上专用页仍待验 |

## 已执行的本地检查

在移动端仓库执行：

```text
pnpm exec tsc --noEmit
pnpm exec vitest run                 # 64/64
pnpm exec expo lint                  # 0 error / 0 warning
pnpm exec expo export --platform web
sh scripts/verify-production-scan.sh
```

上述检查证明源码和本地构建边界；没有把生产 JSON、TestFlight、支付 provider
或实体设备结果冒充本地测试结果。原生 iOS 使用已提交 workspace 和 `xcodebuild`，
不使用 Expo/EAS 构建。

## 完成前必须补齐的外部证据

1. 使用可撤销的 Admin Key，在批准的非生产环境验证管理员读请求、401/403/423、
   管理员 step-up/audit 和 logout；完成后撤销凭据。
2. 不部署私有 `/mobile/captcha/*` bridge，不修改生产后端或 Cloudflare。
3. 上传已验证的 `VexluneMobileConsole.ipa` 到 App Store Connect，记录 build ID、
   处理状态、TestFlight 真机流程和审核资料。Android 只有在产品范围恢复时才
   继续 APK/AAB 证据。

在上述证据存在前，项目不能将 Goal 7/8 或总目标标记为“已完成”。
