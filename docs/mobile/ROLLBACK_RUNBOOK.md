# Vexlune Hub 回滚手册

## 触发条件

出现登录大面积失败、Turnstile 绕过或误拒绝、重复支付订单、余额审计不一致、管理员越权、崩溃率显著升高或 Cloudflare challenge 无法完成时，停止扩大 APP 发布并进入回滚评估。

## 操作顺序

1. 记录当前 APP 构建、后端 commit、迁移版本、Cloudflare 规则版本和错误样本。
2. 先暂停有问题的 APP 渠道或 EAS branch，保留可审计的服务端日志。
3. 后端优先回滚到已验证的兼容 commit；数据库迁移只执行向前兼容的修复迁移，禁止直接覆盖生产账务表或删除幂等记录。
4. 若仅 APP 有问题，恢复上一个 EAS update/build；旧 APP 必须仍能使用 Bearer JWT、刷新和当前后端响应契约。
5. 支付或余额异常时暂停自动重试，按 `Idempotency-Key`、订单号和审计事件逐笔核对后再恢复写操作。
6. Cloudflare 规则回滚到最近一次已验证的配置，保持 WAF/TLS/速率限制和服务端 Turnstile 校验，不使用全局关闭挑战作为临时方案。
7. 回滚后用 staging 和只读生产探针验证登录、角色路由、API key、usage、订单查询和管理员审计，再恢复发布。

## 数据安全

保留回滚前后的数据库备份和 SHA-256 清单；不把备份、私钥、profile、Secret、token 或真实用户数据放入 GitHub artifact。任何不可逆账务修复必须由人工审计批准并保留操作记录。
