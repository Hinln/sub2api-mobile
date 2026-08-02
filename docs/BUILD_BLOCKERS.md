# iOS 构建与签名边界

## 未签名构建

1.0.2 的源码元数据和 GitHub macOS 工作流已配置为 Hub Vexlune 1.0.2 (3)。Windows 不能本地生成可信的 iPhoneOS Release 二进制，应通过 `.github/workflows/build-ios-unsigned.yml` 构建。

## 已提供签名材料审计

本机实际证书目录是 `D:\苹果开发者证书`，目录中存在一个 P12 和 `profile.mobileprovision`。未将任何证书、私钥、密码或描述文件复制到仓库。

已从 provisioning profile 中只读验证到：

- 类型：Ad Hoc Distribution（`get-task-allow = false`，包含 1 台登记设备）
- Team ID：`VCUA692Y6H`
- 到期时间：2027-07-28 16:13:55（UTC+8）
- Profile Application Identifier：`VCUA692Y6H.app.eggplant4287.coral6481`
- 唯一登记设备与先前已连接的 iPhone 一致

当前 App 必须保持 `com.vexlune.mobile`，因此该 profile 与当前 Bundle ID **不匹配**。不能在保持 `com.vexlune.mobile` 的同时使用它生成可安装签名。

正式签名前必须满足下列其一：

1. 提供 Team ID `VCUA692Y6H` 下、Application Identifier 为 `VCUA692Y6H.com.vexlune.mobile` 且包含目标 iPhone UDID 的新 Ad Hoc profile；或
2. 用户明确授权将 App Bundle ID 改为当前 profile 对应值。本次任务没有做这项变更。

已使用内存中的临时证书集合读取 P12，没有导入 Windows 证书库。指纹比对确认：P12 包含私钥，且与 profile 内唯一 Apple Distribution 证书完全匹配；证书有效期同样至 2027-07-28 16:13:55（UTC+8）。因此证书链本身可用，当前唯一实质阻塞是 profile 的 Bundle ID 不匹配。在匹配 profile 取得前，不应将任何 IPA 声明为“已可安装”。

## 设备安装

用户已说明 iPhone 当前未连接。安装和设备端查询延后到用户再次连接手机并发出安装指令时执行。
