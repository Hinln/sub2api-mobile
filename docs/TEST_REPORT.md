# 测试报告

日期：2026-10-03（Asia/Shanghai）。

| 检查 | 结果 |
|---|---|
| `pnpm install --frozen-lockfile --offline --ignore-scripts` | 通过 |
| TypeScript `pnpm exec tsc --noEmit` | 通过（使用工作区 bundled Node 运行时） |
| ESLint `pnpm exec expo lint` | 通过，0 error、0 warning |
| Vitest `pnpm exec vitest run` | 10 文件、49 测试通过 |
| Expo Web `pnpm exec expo export --platform web` | 通过，Metro 处理 3014 个模块 |
| iOS 原生工程 | 已提交 `ios/`；构建流程不运行 Expo prebuild |
| iOS Simulator Release | 通过；产物包含 arm64/x86_64 |
| iPhoneOS Release unsigned | 通过；arm64 `.app` 已打包并验证 IPA 完整性；未签名不能安装真机 |
| `pnpm dlx expo-doctor@1.20.4` | 主机直接运行 15/18；临时 npm shim 重跑 18/18；CI 已统一 pnpm，见 `BUILD_BLOCKERS.md` |
| 原生 iOS workflow `37051524996` | 步骤前失败 | GitHub billing issue 导致 steps=0、无 artifact；本机原生构建不受影响 |
| Android | 暂缓 | 当前范围不开发、不构建、不签名 Android；恢复范围后再配置 SDK/Gradle/签名 |

已覆盖的客户端规则：HTTPS Hub URL 校验、模型 API/管理域隔离、Bearer token、单飞刷新、401 清理、Cloudflare HTML challenge 识别、非幂等写请求不自动重试、SecureStore 设备级存储、退出清理、用户 API key/公告/订单错误态和稳定幂等键。

API 合同基线为官方 Sub2API `v0.2.13`；本地源码测试不替代非生产 provider captcha、支付 sandbox、staging 账号和实体设备证据。本轮没有修改或部署后端，也没有执行生产写操作。
