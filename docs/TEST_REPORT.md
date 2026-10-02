# 测试报告

日期：2026-10-03（Asia/Shanghai）。

| 检查 | 结果 |
|---|---|
| `pnpm install --frozen-lockfile --offline --ignore-scripts` | 通过 |
| TypeScript `pnpm exec tsc --noEmit` | 通过 |
| ESLint `pnpm exec expo lint` | 通过，0 error；仅保留 Metro 兼容所需的 CommonJS import warning |
| Vitest `pnpm exec vitest run` | 4 文件、23 测试通过 |
| Expo Web `pnpm exec expo export --platform web` | 通过，Metro 处理 3014 个模块 |
| iOS prebuild | 通过（隔离目录生成 Xcode project） |
| iOS Xcode 编译 | 环境阻塞：CocoaPods 未安装，Xcode 许可尚未接受；见 `BUILD_BLOCKERS.md` |
| `pnpm dlx expo-doctor` | 14/18 检查通过；因 pnpm/npm 双锁文件和系统缺少 npm，有 4 项检查无法通过或无法完成；见 `BUILD_BLOCKERS.md` |
| `pnpm dlx eas-cli --version` | 通过（24.8.0）；账号登录和云端凭据尚未验证 |
| Go 后端测试 | 环境阻塞：当前机器无 `go`/`gofmt`；后端新增测试已提交，需在 CI/Go 构建机执行 |

已覆盖的客户端规则：HTTPS Hub URL 校验、模型 API/管理域隔离、Bearer token、单飞刷新、401 清理、Cloudflare HTML challenge 识别、非幂等写请求不自动重试、SecureStore 设备级存储、退出清理、用户 API key/公告/订单错误态和稳定幂等键。

后端新增测试覆盖：Turnstile action/hostname 严格匹配、Redis nonce TTL/绑定/原子单次消费、支付订单 idempotency handler 路径。真实 Cloudflare、支付 sandbox、staging 账号和生产写操作尚未执行。
