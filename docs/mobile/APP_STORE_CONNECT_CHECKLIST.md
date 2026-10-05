# App Store Connect / TestFlight 发布清单

本清单记录 Vexlune Hub 从签名归档到 App Review 的人工门槛。它不包含 Apple 密码、API 私钥、证书私钥或 provisioning profile。

## 当前外部状态证据

检查日期：2026-10-05（Asia/Shanghai）。

- [x] App Store Connect 已存在 `Vexlune Hub` App 记录（App ID `6818636344`），iOS 版本已更新为 `1.0.1` 并处于“准备提交”。
- [x] Apple Developer App ID `Vexlune Mobile Console` / `com.vexlune.mobile` 已存在。
- [x] Apple Developer 已有有效 Distribution certificates；本机钥匙串已导入 iPhone Distribution 身份，签名验证已通过。
- [x] 已有有效 Ad Hoc profile `Vexlune Mobile Console Ad Hoc 20260907`，绑定 `com.vexlune.mobile`。
- [x] 已创建并下载绑定 `com.vexlune.mobile` 与新 iOS Distribution 证书的 App Store profile `Vexlune Mobile Console App Store 20261003 Distribu`，有效期至 2027-10-03。
- [ ] App Store Connect 尚无上传构建，iPhone 截图当前为 0/10。

## App 记录

- [x] App Store Connect 中的 App 名称为 `Vexlune Hub`。
- [x] Bundle ID 为 `com.vexlune.mobile`，与 `app.json` 和 Xcode 工程一致。
- [ ] 主语言、SKU、价格/税务类别与业务资料已确认。
- [ ] 隐私政策 URL 和技术支持 URL 使用可公开访问的 HTTPS 第一方页面。
- [ ] 描述、关键词、宣传文本和年龄分级已由产品负责人确认。
- [ ] iPhone 截图覆盖 App Store Connect 要求的设备尺寸；截图不包含真实用户数据、token、Cloudflare secret 或内部域名。

## 签名与构建

- [x] Xcode 中选择 Team `6KW552MWV6`，Bundle ID 与 App ID 匹配，受控 provisioning profile 与签名身份已验证。
- [x] ASC 版本与工程 `CFBundleShortVersionString=1.0.1` 已对齐；build number 为 `2`，上传前仍需保持两者一致。
- [x] 当前工作树提交 `2a07917` 的原生 `archive` 和 `-exportArchive` 已完成，解包后的 App 通过 `codesign --verify --deep --strict`，IPA SHA-256 为 `d536d11d35a2d1a3d72791468d073a226e2a1825dd289f87d71b02becfe9406c`，archive dSYM UUID 为 `CBC5924B-9EB3-332A-9337-033714D7BBEB`；不使用 Expo/EAS 云构建或托管签名。
- [x] iOS 26.5 Simulator 已安装并启动当前 Release `.app`（iPhone 17 Pro Max，UDID `1453B2BD-6F79-4861-9090-03284CF7E859`）；这只证明本机模拟器启动路径，不能替代实体 iPhone/TestFlight 验收。
- [x] 当前 Turnstile 工作树已重新导出包内 App 并通过 `codesign --verify --deep --strict`；已记录 IPA SHA-256 和构建 commit。archive UUID 与 App Store Connect build ID 待上传后补录。
- [ ] 上传完成后记录 App Store Connect build ID、处理状态和导出日志摘要。

## TestFlight 验收

- [ ] 内部测试组已加入，测试账号分别覆盖普通用户和管理员角色。
- [ ] 真机使用可撤销的 Admin Key 完成管理员工作台登录、401 失效、退出和 SecureStore 清理。
- [ ] 管理员侧用户、账号、分组、日志、公告、订单资金与设置权限和审计事件符合官方后端结果。
- [ ] Cloudflare challenge（如生产策略启用）只按官方服务端校验结果放行；APP 不保存或发送 Cloudflare secret。
- [ ] 崩溃、401/403/429、Turnstile、支付幂等冲突和 API p95 监控已开启，日志不含 token/secret。

## 审核提交

- [ ] 审核备注包含测试账号、登录步骤和 Turnstile/管理员测试说明；账号权限最小化且可撤销。
- [ ] 出口合规、加密声明、内容权利和年龄分级已完成。
- [ ] 发布方式（手动/自动）、分阶段发布比例和回滚负责人已记录。
- [ ] App Review 结果、审核版本和最终上线时间写入发布记录；失败时按 `ROLLBACK_RUNBOOK.md` 停止扩大发布。
