# 原生 iOS 构建

Vexlune 的 iOS 工程现在作为源码保存在 `ios/`，由 Xcode 和 CocoaPods 直接构建。发布流程不会运行 `expo prebuild`、`expo run:ios` 或 EAS Build，因此不会根据 `app.json` 覆盖工程、签名设置或原生改动。

仓库仍使用 Expo Router 和 Expo 原生模块（安全存储、生物识别、剪贴板等）作为 React Native 运行时依赖。这些模块通过版本化的 Podfile 和 CocoaPods 安装；它们不等同于使用 Expo 云构建。完整移除 Expo runtime 需要替换路由、SecureStore、LocalAuthentication、Clipboard 和 WebView 等模块，属于独立迁移，当前版本保留这些已验证功能。

## 本地构建

```sh
pnpm install --frozen-lockfile
pnpm run native:build:ios
```

默认生成未签名的 iOS Simulator Release。设备构建使用：

```sh
IOS_SDK=iphoneos IOS_DESTINATION='generic/platform=iOS' \
  CODE_SIGNING_ALLOWED=YES pnpm run native:build:ios
```

脚本会检查版本化的 Xcode workspace，安装 CocoaPods，然后执行 `xcodebuild`。CocoaPods 的 Ruby Logger 兼容处理只作用于当前命令；Apple 证书和私钥不会写入仓库。

App Store/TestFlight 归档使用 `scripts/export-ios-appstore.sh`。脚本在 archive 旁写入
源码 commit 标记，避免复用旧源码归档；源码或分支变化后会自动重新 archive。只有
已人工核验归档内容时，才设置 `IOS_REUSE_ARCHIVE=1` 跳过这个保护。

## JavaScript 打包

Xcode 的 `Bundle React Native code and images` 阶段调用 React Native 自带的 `react-native-xcode.sh`，入口为 `expo-router/entry.js`。`@react-native-community/cli`、`@react-native/metro-config`、`@babel/runtime` 和 `@react-native/assets-registry` 已作为直接依赖锁定，以确保 pnpm 的严格依赖解析在干净 checkout 中可复现。Metro 配置显式解析 `@/` 源码别名。

`expo` 相关包只提供应用运行时模块；发布构建不调用 Expo CLI，也不使用 EAS。
