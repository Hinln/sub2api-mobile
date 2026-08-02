# 测试报告

日期：2026-08-02（Asia/Shanghai）

## 当前已通过

| 检查 | 结果 |
|---|---|
| TypeScript `npm run typecheck` | 通过 |
| ESLint `npm run lint` | 通过，无 error |
| Vitest `npm test` | 4 个测试文件、24 项测试全部通过 |
| Expo Doctor | 18/18 通过 |
| Expo Web export | 通过 |
| Playwright | 3 个 iPhone 视口与 1 个运营能力流程，4/4 通过 |
| in-app Browser | 登录、错误反馈、四个一级 Tab 与财务入口通过 |
| Console error | 0 |
| 横向溢出 | 0 |
| 设计验收 | `design-qa.md` 最终结果 `passed` |
| `git diff --check` | 通过 |

单元测试覆盖 API Client 的正常响应、JSON/非 JSON 错误、401/403/502/503、Request ID、GET 重试、POST 不重试、取消和缺失凭据，以及 SecureStore 保存/清理、URL HTTPS 校验、Hub/API 域名隔离、秘密脱敏、状态映射、金额和 Token 格式、分页参数等规则。

## 最终交付前待验收

| 检查 | 当前状态 |
|---|---|
| GitHub macOS 未签名 IPA 构建与结构校验 | 待提交并触发工作流 |

本报告采用 1.0.2 最终代码重新执行的结果，不沿用旧版本截图或旧导航测试结论。完整视觉证据见 `artifacts/screenshots/`、`artifacts/design-qa/reference-vs-implementation.png` 与根目录 `design-qa.md`。

生产写操作未做破坏性验证：当前环境没有用于真实 Hub 联调的合法管理员凭据，且不应对生产用户、余额、支付订单或账号状态做测试性修改。
