# Vexlune Hub Turnstile 整改进度

更新时间：2026-10-04

## 已确认的现状

- 移动端分支：`codex/vexlune-hub`；后端分支：`codex/backend-hardening-pr`。
- 账号站点 origin：`https://hub.vexlune.com`；模型 API origin 不用于登录。
- 公开配置：`GET /api/v1/settings/public`。
- 认证接口：`POST /api/v1/auth/login`、`/api/v1/auth/register`、
  `/api/v1/auth/send-verify-code`、`/api/v1/auth/forgot-password`，二次验证为
  `/api/v1/auth/login/2fa`。
- 生产公开配置当前返回 `turnstile_enabled=true` 和公开 Site Key；Secret Key
  不在移动端或前端代码中。
- Sub2API 生产版本约束保持 `0.2.13`；本次没有修改后端版本、数据库或生产主机。

## 本次实现

1. 后端前端新增同源 `/mobile/turnstile` 路由。页面只加载显式 Turnstile SDK、
   公开设置和官方 widget，不加载登录页、营销内容或协议弹窗。
2. 页面和 APP 使用版本化消息协议，字段包含 `version`、`type`、`requestId`、
   `nonce`、`action`，并对 token 长度、消息大小、来源和实例匹配做校验。
3. APP 删除完整登录/注册网页的 DOM 抓取、iframe 观察和自动点击协议脚本，改为
   受约束的同源专用页 WebView。认证仍把一次性 token 原样交给现有官方接口。
4. 配置读取失败、缺少 Site Key、非 Cloudflare 验证供应商、SDK 错误、过期和
   Cloudflare 后端拒绝都 fail closed；token 只存于内存，成功或失败后立即丢弃。
5. 页面保持浅色 Vexlune Hub 登录 UI。验证 WebView 在用户提交后才显示，避免首次打开
   登录页出现网页内容片段；注册邮箱验证码仍由公开设置决定。
6. 本地令牌刷新会把 `instanceKey` 纳入 WebView key，强制创建新文档并生成新的
   requestId/nonce；原生消息还必须来自同源 `/mobile/turnstile` 主文档路径，避免
   同源其他页面伪造桥消息。

## 自动化证据

| 检查 | 结果 |
| --- | --- |
| mobile `pnpm typecheck` | 通过 |
| mobile `pnpm test` | 通过，11 个测试文件 / 55 个测试 |
| mobile `pnpm lint` | 通过 |
| frontend `pnpm typecheck` | 通过 |
| frontend `pnpm build` | 通过，生成 `MobileTurnstileView` 资源 |
| 官方 `v0.2.13` 干净补丁 | 通过 | 在 tag `3040209f205472038c1ba745a1bedd2edd9053b1` 临时检出应用最小补丁，`git apply --check`、`vue-tsc -b` 和 `vite build` 均通过；没有部署或修改生产。 |
| iOS 原生 Xcode Release Simulator 构建 | 通过，`VexluneMobileConsole.app` |
| iOS 模拟器安装启动 | 通过，bundle `com.vexlune.mobile` |
| 当前提交签名 IPA | 通过，提交 `32dedab`，SHA-256 `6b82d9ebe482d15885d4f986bb64498e768506e8ffd2355ea1690065459e031e`，dSYM UUID `54E47192-6BBA-32DC-AFE3-F059DA104365` |
| 生产 `/mobile/turnstile` 线上联调 | 未通过：线上返回旧 SPA 壳，入口 bundle 不含 `MobileTurnstile` 路由 |
| 真实挑战与真实账号登录 | 未完成：需要部署后由授权账号完成一次交互 |
| Android 实机 | 未测试：本阶段只交付 iOS |

## 发布前操作（需确认）

1. 在隔离环境部署后端前端 bundle，确认 `/mobile/turnstile` 不重定向到登录页，
   CSP 允许 `https://challenges.cloudflare.com` 的 script/frame/connect 资源。
2. 用 Cloudflare 官方测试 Site Key/Secret 配对验证成功、失败、过期和重放分支；
   生产密钥不能用于测试 token。
3. 再用批准的测试账号在 iOS 模拟器或真机完成一次 Turnstile，验证登录、注册邮箱
   验证码和找回密码的真实接口。
4. 生产发布顺序：先发布兼容的前端路由和缓存，再发布 APP；不需要服务器二开、迁移、
   Secret Key 变更或私有换票接口。

## 回滚

只回滚前端 bundle/APP 版本到上一份已验证产物，恢复受影响 HTML 缓存；不要通过关闭
Turnstile、放行 API、加入 User-Agent 豁免或使用 `cf_clearance` 回滚。生产部署、服务重启、
Cloudflare 规则/密钥变更和缓存清理均等待操作人明确确认。
