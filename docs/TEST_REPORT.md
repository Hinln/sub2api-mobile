# 测试报告

日期：2026-08-02（Asia/Shanghai）

| 检查 | 结果 |
|---|---|
| `npm ci` | 通过 |
| TypeScript `tsc --noEmit` | 通过 |
| ESLint `expo lint` | 通过，无 error |
| Vitest | 3 文件、20 测试通过 |
| API Client | 正常、JSON/非 JSON 错误、401/403/502/503、Request ID、GET 重试、POST 不重试、取消、缺凭据通过 |
| SecureStore | 设备级可访问性、保存、退出清理、幂等删除通过 |
| Expo Doctor | 18/18 通过 |
| Expo Web export | 通过 |
| Playwright | 3 个视口流程全部通过 |
| Console error | 0 |
| 横向溢出 | 0 |

覆盖的核心规则：URL HTTPS 校验、Hub/API 域名隔离、Token 脱敏、状态映射、金额和 Token 格式、分页参数、401/403/429/502/503 错误文本、只重试幂等请求、退出登录清理。

生产写操作未测试：环境没有合法管理员凭据，且任务禁止对生产用户、余额和账号进行破坏性验证。
