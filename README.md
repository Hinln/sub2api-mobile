# Hub Vexlune

Hub Vexlune 是 Vexlune Hub 的 iOS 移动管理控制台。项目基于 Expo 54、React Native、Expo Router、TanStack Query、Valtio 与 SecureStore。

- 管理服务：`https://hub.vexlune.com`
- 模型 API（仅展示边界）：`https://api.vexlune.com`
- Bundle ID：`com.vexlune.mobile`
- URL Scheme：`vexlunemobile`
- Version / Build：`1.0.2 / 3`

## 本地验证

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run web:build
npm run test:visual
```

首次启动需要输入合法的 Sub2API 管理员 API Key（通常以 `admin-` 开头）。原生端凭据仅写入系统 SecureStore；Web 验收不持久化凭据。

无签名 iOS 真机构建由 `.github/workflows/build-ios-unsigned.yml` 在 macOS Runner 完成。未签名 IPA 不能直接安装，请先阅读 `docs/SIGNING_GUIDE.md`。

## 开源归属

本项目基于 [ckken/sub2api-mobile](https://github.com/ckken/sub2api-mobile) 改造，保留原始 `LICENSE`、版权与依赖许可证信息。后端接口语义参考 [Wei-Shaw/sub2api](https://github.com/Wei-Shaw/sub2api)。
