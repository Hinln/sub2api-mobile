# 项目审计

## 基线

- 上游：`https://github.com/ckken/sub2api-mobile.git`
- 原始分支：`main`
- 原始提交：`3177500 feat: streamline account overview list workflow`
- 开发分支：`codex/vexlune-ios-admin`
- 后端参考：`Wei-Shaw/sub2api@b74024c`
- 工作区开始时为空，无用户未提交修改。

## 发现

1. 上游是 Expo 54 / React Native 0.81 / Expo Router / TypeScript 项目，可复用请求层、页面和类型结构。
2. `app.json` 绑定了上游 Expo owner、Project ID、Update URL、Bundle ID、Scheme 与图标；已全部解除。
3. 上游默认允许任意服务器地址并维护多服务器资料；Vexlune 版本改为固定 Hub 地址，地址覆盖收进风险明确的高级设置。
4. 管理认证实际支持 `x-api-key` 管理 API Key 与管理员 JWT；上游移动端已采用 `x-api-key`，本版本延续该方式。
5. 原请求层无超时、Request ID、状态型错误、取消、幂等重试约束与 401 全局清理；已重构。
6. 原登录和用户页面存在中文乱码，主题是浅色米色，导航只有概览/用户/服务器；已重构为完整中文深色五栏导航。
7. 原项目没有单元测试、API Client 测试、Playwright、多视口截图或无签名 iOS 工作流；已补齐。
8. 权限仅保留网络、安全存储和生物识别；未配置推送、定位、相机、相册、麦克风、通讯录、蓝牙、广告追踪、iCloud、App Groups、Associated Domains 或后台模式。

## 品牌与原生配置结论

- 名称：Vexlune Mobile Console
- 短品牌：Vexlune
- Bundle ID：`com.vexlune.mobile`
- Scheme：`vexlunemobile`
- Updates：禁用
- EAS owner/project/update URL：无
- 图标：全新黑紫几何 V，RGB、无 Alpha
