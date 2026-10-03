# Vexlune Hub 回滚手册

## 触发条件

出现登录大面积失败、provider captcha 误拒绝、重复支付订单、余额审计不一致、
管理员越权、崩溃率显著升高或 Cloudflare challenge 无法完成时，停止扩大 iOS
发布并进入回滚评估。生产后端和 Cloudflare 配置不在本轮移动回滚范围内。

## 操作顺序

1. 记录当前 iOS 构建、官方 Sub2API v0.2.13 合同版本、非生产环境和错误样本。
2. 先暂停有问题的 APP 渠道或 CI 发布流水线，保留可审计的服务端日志。
3. 若仅 APP 有问题，恢复上一个已签名的 iOS archive/TestFlight build；旧 APP 必须仍能使用 Bearer JWT、刷新和官方 v0.2.13 响应契约。
4. 支付或余额异常时暂停自动重试，按官方服务端返回的订单号和审计事件逐笔核对后再恢复写操作。
5. 不通过部署私有 captcha bridge、修改生产 API 或放宽 Cloudflare 规则来修复客户端回归。
6. 回滚后用批准的非生产环境验证登录、角色路由、API key、usage、订单查询和管理员审计，再恢复分发。

## 数据安全

保留回滚前后的数据库备份和 SHA-256 清单；不把备份、私钥、profile、Secret、token 或真实用户数据放入 GitHub artifact。任何不可逆账务修复必须由人工审计批准并保留操作记录。
