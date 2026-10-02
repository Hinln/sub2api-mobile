# 构建信息

- 源码分支：`codex/vexlune-hub`
- App：Vexlune Mobile Console 1.0.1 (2)
- Bundle ID：`com.vexlune.mobile`
- Scheme：`vexlunemobile`
- 目标工作流：iPhoneOS / Release / arm64 / unsigned
- JavaScript 包管理器：pnpm 11.19.0；仓库仅保留 `pnpm-lock.yaml`，GitHub Actions 已使用 `pnpm install --frozen-lockfile`
- Expo Web 构建：通过
- iOS prebuild：通过（隔离目录）
- macOS Xcode 编译：已验证可进入编译阶段；因 CocoaPods 未安装而在 `Podfile.lock` 检查阶段停止
- 代码签名：本机 0 个签名身份；未生成 IPA
- Apple/Xcode 账号：Xcode 偏好设置保留公司团队 `6KW552MWV6` 与 Personal Team `2B5JU96JLT`，但未发现签名身份或 provisioning profile，不能据此确认开发者会话有效
- 原生构建入口：`pnpm run native:build:ios`（Xcode）与 `pnpm run native:build:android`（Gradle）；Expo 仅用于 prebuild 生成原生工程
- 本机 Xcode 许可尚未接受；无云构建凭据依赖
- 远端 unsigned iOS 尝试：run `37051524996` 未启动，GitHub 账号因 billing issue 被锁定；未生成 IPA
- Android prebuild：隔离目录通过；本机没有 Android SDK/Java/adb，未生成 APK/AAB；原生 Gradle CI 已加入 `build-android-native.yml`

成功运行工作流后，动态架构、Workspace、Scheme、Bundle 与签名状态将写入 Artifact 内的 `BUILD_INFO.md`。
