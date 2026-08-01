# 未签名 IPA 重新签名指南

1. 工作流产出的 IPA 是未签名包，不能直接在普通 iPhone 上运行。
2. 安装前必须使用有效证书和匹配的 Provisioning Profile 重新签名。
3. 默认 Bundle ID 为 `com.vexlune.mobile`；描述文件必须与 Bundle ID 兼容。
4. 当前只使用最小能力：网络、SecureStore 与 Face ID/Touch ID；没有扩展、Widget、Push、iCloud、App Groups、Associated Domains 或后台模式。
5. `Vexlune.app/Frameworks` 中的动态 Framework 必须先递归签名，最后签名主 APP。
6. 重新签名后用 `codesign --verify --deep --strict --verbose=2 Vexlune.app` 验证，并检查 `codesign -d --entitlements :- Vexlune.app`。
7. 更换 Bundle ID 时同时检查 URL Scheme `vexlunemobile`、SecureStore/Keychain 行为和描述文件 Entitlements。
8. 不要把 P12、私钥、密码或 Provisioning Profile 提交到仓库、日志或截图。
9. 注入额外动态库的第三方签名工具会扩大攻击面；本项目不保证任何第三方签名服务的安全性、合法性或稳定性。
10. 签名完成后再验证 IPA 根目录仍直接包含 `Payload/Vexlune.app`。
