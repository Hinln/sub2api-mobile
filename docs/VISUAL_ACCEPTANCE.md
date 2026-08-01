# 移动视觉验收

Playwright 使用构建后的 Expo Web 包，网络请求在测试层拦截；生产代码没有 Mock 回退。

视口：

- 375 × 667
- 393 × 852
- 430 × 932

每个视口输出：登录、概览、用户、账号、日志、更多，共 18 张 PNG。

检查结论：无横向滚动、无文本截断、无按钮重叠、底部导航未遮挡内容、深色对比度清晰、中文完整，375px 小屏可用。截图目录：`artifacts/screenshots/`。

Web 无法真实模拟 iOS 键盘、Face ID 和 Home Indicator；键盘页使用 `KeyboardAvoidingView`，Safe Area 使用 `react-native-safe-area-context`，生物识别仅在原生端启用。
