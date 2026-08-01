# 安全审查

- 管理域名和模型域名由独立常量定义；URL 校验明确拒绝把 `api.vexlune.com` 作为管理地址。
- 管理员 Token 原生端存 SecureStore，访问级别为 `WHEN_UNLOCKED_THIS_DEVICE_ONLY`；Web 不持久化 Token。
- 没有硬编码管理员 Token、用户 API Key、Cookie、密码、证书、P12、Provisioning Profile、数据库 DSN、Redis、SSH 或内网 IP。
- Authorization 与 Token 不写日志；服务端错误会截断和遮蔽常见 Key 前缀。
- 退出登录清理 Token、生物识别偏好、查询缓存和内存状态。
- 401 自动结束会话；403/429/5xx 不导致白屏。
- 写操作不自动重试；余额和调度动作需要二次确认并防重复提交。
- 未配置推送、定位、相机、相册、麦克风、通讯录、蓝牙、跟踪、iCloud、后台模式、扩展或 App Groups。
- 未签名构建移除 `_CodeSignature` 与 `embedded.mobileprovision`，并检查没有意外签名。

已执行非破坏性的 `npm audit fix`，Critical 降为 0；仍有 Expo 54 构建工具链中的 1 个 High（PostCSS）和 16 个 Moderate 传递依赖。未使用 `npm audit fix --force`，因为它会强制升级到 Expo 57 并破坏当前锁定兼容性。应随 Expo SDK 升级持续跟进；这些项属于构建/预构建工具链，不是 APP 内接受外部 CSS/YAML 输入的运行时功能。
