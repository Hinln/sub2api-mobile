# 实施计划与状态

1. 项目、API、品牌、权限审计 — 已完成。
2. Vexlune 名称、图标、Bundle ID、Scheme、Updates 解绑 — 已完成。
3. 邮箱密码 + Bearer JWT/refresh、SecureStore、401 清理、生物识别锁 — 已完成。
4. 概览、用户、账号、日志、分组、API Key 用户视图 — 已完成。
5. 统一 loading/empty/error/retry/refresh/search/filter/pagination — 已完成。
6. 单元、API Client、SecureStore、Web 构建和三视口验收 — 已完成。
7. 原生 iPhoneOS Release/arm64 构建 — 已由已提交的 Xcode workspace 与本机 `xcodebuild` 验证；不使用 Expo/EAS 构建。Android 按当前范围暂缓。
8. IPA、`.app`、SHA-256 下载与包结构验证 — 本机签名 IPA 已验证；TestFlight 处理和真机验收仍是外部门槛，见 `BUILD_BLOCKERS.md`。
