# iOS 构建环境阻塞

## 当前状态

全部源码、Windows 测试、Expo Web 构建、Playwright 验收、iOS Prebuild/Pods/Xcode 工作流和签名文档已经完成。IPA 尚未生成。

## 阻塞原因

`gh auth status` 返回“not logged into any GitHub hosts”，当前只配置了原作者只读远程 `upstream = https://github.com/ckken/sub2api-mobile.git`。因此无法自动创建可写 Fork、Push 分支或启动 GitHub macOS Runner。Windows 没有 Xcode，不能在本机伪造 iPhoneOS 编译。

## 用户唯一需要做的动作

在本机完成一次 `gh auth login`，允许对自己仓库写入和运行 Actions。之后执行：

```bash
gh repo fork ckken/sub2api-mobile --clone=false --remote
git push -u origin codex/vexlune-ios-admin
gh workflow run build-ios-unsigned.yml --ref codex/vexlune-ios-admin
gh run list --workflow build-ios-unsigned.yml --limit 1
gh run watch <RUN_ID> --exit-status
gh run download <RUN_ID> --dir dist/ios
```

预期 IPA：`dist/ios/Vexlune-Mobile-Console-v1.0.0-ios-unsigned.ipa`。
