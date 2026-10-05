# Vexlune Hub 发布运行手册

本手册针对官方 Sub2API `v0.2.13` API 合同（tag commit
`3040209f205472038c1ba745a1bedd2edd9053b1`）。本次移动发布不修改或部署
后端，不执行生产迁移，不调整生产设置或 Cloudflare 规则。

首版只发布原生 iOS。Android 暂缓，不能因为存在历史 Gradle workflow 就把
Android 构建列为发布步骤。

## 发布前检查

1. 固定并记录 API 基线为官方 `v0.2.13`，确认目标环境的
   `GET /api/v1/settings/public` 与公开认证 DTO 一致。官方版本没有
   `/mobile/captcha/*`；登录、注册和密码找回只提交 provider 官方 token 字段。
2. 使用已批准的非生产环境和可撤销账号完成 QA。禁止为移动发布把私有 backend
   分支、迁移或 mobile captcha bridge 部署到生产。
3. 在移动仓库执行类型、测试和占位扫描；执行
   `scripts/verify-mobile-origin.sh`，确认公开 settings、三个第一方认证页面和
   `/mobile/turnstile` 专用页面均为 HTML/JSON 200，并且没有 secret。该脚本不调用
   `/mobile/captcha/*` 私有 backend bridge。
4. 检查 Bundle ID、版本/build、隐私与支持链接、截图、年龄分级、审核账号和出口
   合规资料；没有这些资料不能提交 TestFlight/App Review。

官方 `v0.2.13` 前端专用页补丁已推送到
`Hinln/sub2api:codex/v0.2.13-turnstile`（提交 `2f7800160`）。对应本地 bundle
归档为
`/Users/chuzu/Documents/sub2api-app/build/sub2api-v0.2.13-mobile-turnstile-dist-2f7800160.tar.gz`，
SHA-256 为
`c55428d4278da8464958e57232356d57c32b88ebbea5708576e745298aa55b46`。该归档只包含
官方前端 `dist`，不包含后端改造、Cloudflare secret 或数据库文件。

## 自动化检查

```bash
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm exec expo lint
pnpm exec vitest run
pnpm run verify:production-scan
pnpm run web:build                 # 可选，只作 Web 静态烟测
```

Web export 和 Expo lint 可以使用 Expo CLI；它们不构建原生包，也不改变后端。

## 原生 iOS 构建

`ios/VexluneMobileConsole.xcworkspace` 是原生工程的来源。发布构建直接使用
CocoaPods 和 Xcode `xcodebuild`；不要运行 `expo prebuild`、`expo run:ios`、EAS
Build 或任何 Expo 云构建来生成发布包。Expo runtime 模块仍可作为应用依赖存在，
但不能成为 iOS 工程生成或签名服务。

```bash
# Simulator Release
IOS_SDK=iphonesimulator CODE_SIGNING_ALLOWED=NO \
  pnpm run native:build:ios

# iPhoneOS archive（需要本机 Xcode/证书时再开启签名）
IOS_SDK=iphoneos IOS_DESTINATION='generic/platform=iOS' \
  CODE_SIGNING_ALLOWED=YES CODE_SIGNING_REQUIRED=YES \
  pnpm run native:build:ios

# App Store/TestFlight export（本机 Keychain 中必须有 Distribution 身份和 profile）
sh scripts/export-ios-appstore.sh
```

`native-build-ios.sh` 会校验已提交的 workspace，并调用 `xcodebuild`；它故意不
运行 Expo prebuild。`export-ios-appstore.sh` 在本机完成 archive/export 和
`codesign --verify --deep --strict`，凭据必须来自 macOS Keychain 或受控 CI secret，
不能提交仓库或打印日志。脚本会记录 archive 对应的源码 commit；默认只复用与
当前 commit 匹配的 archive，源码变化后会自动重新归档。只有在确认 archive 已由
其他方式审计过时，才可显式设置 `IOS_REUSE_ARCHIVE=1` 复用已有 archive。

## TestFlight 交付

签名 IPA 通过 App Store Connect API key 或受控上传工具提交。记录 archive UUID、
源码 commit、Bundle ID、版本/build、IPA SHA-256、上传时间、处理状态和 TestFlight
真机结果。没有真实处理和真机结果时，只能报告“本地 IPA 已验证”。

## 观测与回滚边界

记录移动端发布 commit、iOS archive/IPA 构建信息、API 合同版本和非生产 QA 报告。
监控 401/403/429、provider captcha 失败、refresh 失败、支付错误、崩溃和 API p95；
不要记录 access token、refresh token、支付凭据或 captcha secret。

若移动端回归，停止扩大 TestFlight 分发并恢复上一个已验证的 iOS build。不要通过
修改生产后端、切换私有 captcha 路由或放宽 Cloudflare 规则来“修复”客户端问题。
