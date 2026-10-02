# Vexlune Mobile Console

Vexlune Hub 的个人 iOS 移动管理控制台。项目基于 Expo 54、React Native、Expo Router、TanStack Query、Valtio 与 SecureStore。

- 管理服务：`https://hub.vexlune.com`
- 模型 API（仅展示边界）：`https://api.vexlune.com`
- Bundle ID：`com.vexlune.mobile`
- URL Scheme：`vexlunemobile`
- Version / Build：`1.0.1 / 2`

## 本地验证

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run web:build
pnpm run test:visual
```

登录和注册只使用邮箱与密码；登录后由服务端识别普通用户或管理员并进入对应工作台。Cloudflare 挑战通过第一方 WebView 获取一次性 token，APP 不保存 secret。会话令牌仅写入系统 SecureStore；Web 验收不持久化凭据。

无签名 iOS 真机构建由 `.github/workflows/build-ios-unsigned.yml` 在 macOS Runner 完成。未签名 IPA 不能直接安装，请先阅读 `docs/SIGNING_GUIDE.md`。

## 开源归属

本项目基于 [ckken/sub2api-mobile](https://github.com/ckken/sub2api-mobile) 改造，保留原始 `LICENSE`、版权与依赖许可证信息。生产后端以私有 [Hinln/sub2api](https://github.com/Hinln/sub2api) 为唯一源，`Wei-Shaw/sub2api` 仅用于公开契约对照。
