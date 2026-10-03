# App Store Connect / TestFlight 发布清单

本清单记录 Vexlune Hub 从签名归档到 App Review 的人工门槛。它不包含 Apple 密码、API 私钥、证书私钥或 provisioning profile。

## 当前外部状态证据

检查日期：2026-10-03（Asia/Shanghai）。

- [x] App Store Connect 已存在 `Vexlune Hub` App 记录（App ID `6818636344`），iOS 版本 `1.0` 当前为“准备提交”。
- [x] Apple Developer App ID `Vexlune Mobile Console` / `com.vexlune.mobile` 已存在。
- [x] Apple Developer 已有有效 Distribution certificates；本机钥匙串当前仅发现 Apple Development 身份。
- [x] 已有有效 Ad Hoc profile `Vexlune Mobile Console Ad Hoc 20260907`，绑定 `com.vexlune.mobile`。
- [x] 已创建并下载绑定 `com.vexlune.mobile` 的 App Store profile `Vexlune Mobile Console App Store 20261003`，有效期至 2027-09-07。
- [ ] App Store Connect 尚无上传构建，iPhone 截图当前为 0/10。

## App 记录

- [ ] App Store Connect 中的 App 名称为 `Vexlune Hub`。
- [ ] Bundle ID 为 `com.vexlune.mobile`，与 `app.json` 和 Xcode 工程一致。
- [ ] 主语言、SKU、价格/税务类别与业务资料已确认。
- [ ] 隐私政策 URL 和技术支持 URL 使用可公开访问的 HTTPS 第一方页面。
- [ ] 描述、关键词、宣传文本和年龄分级已由产品负责人确认。
- [ ] iPhone 截图覆盖 App Store Connect 要求的设备尺寸；截图不包含真实用户数据、token、Cloudflare secret 或内部域名。

## 签名与构建

- [ ] Xcode 中选择 Team `6KW552MWV6`，Bundle ID 与 App ID 匹配，自动签名或受控 provisioning profile 已验证。
- [ ] `CFBundleShortVersionString` 与 App Store Connect 版本一致；每次上传都递增 `CFBundleVersion`。
- [ ] 通过本机或受控 macOS Runner 执行签名 `archive` 和 `-exportArchive`；无签名 iPhoneOS archive 已生成，当前机器仍缺少与该 profile 对应的 Apple Distribution 私钥。不使用 Expo/EAS 云构建或托管签名。
- [ ] 导出包通过 `codesign --verify --deep --strict`，并记录 archive UUID、构建 commit 和 SHA-256。
- [ ] 上传完成后记录 App Store Connect build ID、处理状态和导出日志摘要。

## TestFlight 验收

- [ ] 内部测试组已加入，测试账号分别覆盖普通用户和管理员角色。
- [ ] 真机完成邮箱密码登录、角色路由、401 刷新、退出和 SecureStore 清理。
- [ ] 第一方 Turnstile WebView 在真实 staging 域名返回一次性 token；错误 action/origin、过期和重放均被拒绝。
- [ ] 用户侧 API Key、usage、公告、订阅与订单读取成功；订单幂等键重试不会重复下单。
- [ ] 管理员侧用户、账号、分组、日志与设置权限和审计事件符合后端结果。
- [ ] 崩溃、401/403/429、Turnstile、支付幂等冲突和 API p95 监控已开启，日志不含 token/secret。

## 审核提交

- [ ] 审核备注包含测试账号、登录步骤和 Turnstile/管理员测试说明；账号权限最小化且可撤销。
- [ ] 出口合规、加密声明、内容权利和年龄分级已完成。
- [ ] 发布方式（手动/自动）、分阶段发布比例和回滚负责人已记录。
- [ ] App Review 结果、审核版本和最终上线时间写入发布记录；失败时按 `ROLLBACK_RUNBOOK.md` 停止扩大发布。
