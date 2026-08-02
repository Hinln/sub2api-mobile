# 管理 API 审计

审计日期：2026-08-02。权威后端参考：`Wei-Shaw/sub2api@7e2e9ba05026b7126318aa0754c1afa0ac00bc58`。以下“已接入”表示本客户端已有调用代码和页面，不表示已经使用生产管理员凭据完成写入联调。

## 认证与响应

- 管理基地址：`https://hub.vexlune.com`
- 管理路由前缀：`/api/v1/admin`
- 模型 API：`https://api.vexlune.com`，本管理客户端不向其发送推理请求。
- 当前 App 认证：`x-api-key: <admin-api-key>`。
- 后端同时支持 `Authorization: Bearer <admin-jwt>`；App 当前使用 Admin API Key，不依赖 Cookie。
- 标准响应：`{ code, message, reason?, metadata?, data? }`。
- 分页请求：`page`、`page_size`；分页响应：`items`、`total`、`page`、`page_size`、`pages`。
- 列表排序使用后端实际参数 `sort_by`、`sort_order`。
- Request ID：读取 `x-request-id` 或 `request-id` 响应头。

## 已接入接口

| 模块 | 方法与路径 | 客户端用途 |
|---|---|---|
| Dashboard | `GET /dashboard/stats` | 总量、今日数据、RPM/TPM |
| Dashboard | `GET /dashboard/trend` | 小时/日趋势 |
| Dashboard | `GET /dashboard/models` | 模型分布、Token 和计费分析 |
| Dashboard | `GET /dashboard/snapshot-v2` | 聚合快照兼容入口 |
| Payment | `GET /payment/dashboard` | 实收、订单数、趋势、支付方式和高消费用户 |
| Payment | `GET /payment/orders` | 订单搜索、状态筛选、分页和详情 |
| Payment | `GET /payment/plans` | 套餐、价格、有效期、分组限额和模型范围 |
| Promo codes | `GET /promo-codes` | 优惠码列表、搜索、状态筛选和排序 |
| Promo codes | `GET /promo-codes/:id/usages` | 优惠码使用记录 |
| Promo codes | `POST /promo-codes` | 创建优惠码 |
| Announcements | `GET /announcements` | 公告列表、搜索、状态筛选和排序 |
| Announcements | `GET /announcements/:id/read-status` | 公告阅读状态 |
| Announcements | `POST /announcements` | 创建公告 |
| Audit logs | `GET /audit-logs` | 管理员操作审计、筛选和分页 |
| Settings | `GET /settings` | 站点名称和只读配置 |
| System | `GET /system/version` | 版本与运行信息 |
| Users | `GET /users` | 搜索、状态、排序和分页 |
| Users | `GET /users/:id` | 用户详情 |
| Users | `PUT /users/:id` | 启用/禁用 |
| Users | `POST /users/:id/balance` | set/add/subtract 三种明确余额语义 |
| Users | `GET /users/:id/usage` | 用户用量 |
| Users | `GET /users/:id/api-keys` | 用户 API Key 列表 |
| Accounts | `GET /accounts` | 搜索、状态、排序和分页 |
| Accounts | `POST /accounts` | 创建账号 |
| Accounts | `GET /accounts/:id` | 账号详情 |
| Accounts | `PUT /accounts/:id` | 编辑账号 |
| Accounts | `GET /accounts/:id/stats` | 账号统计 |
| Accounts | `GET /accounts/:id/models` | 账号可用模型 |
| Accounts | `POST /accounts/:id/test` | 解析 `text/event-stream` 测试结果并返回连接状态与延迟 |
| Accounts | `POST /accounts/:id/refresh` | 刷新状态 |
| Accounts | `POST /accounts/:id/schedulable` | 暂停/恢复调度 |
| Accounts | `POST /accounts/:id/clear-error` | 清除错误 |
| Accounts | `POST /accounts/:id/recover-state` | 恢复状态 |
| Groups | `GET /groups` | 分组、平台、账号数、倍率和配额 |
| Usage | `GET /usage` | 请求日志、模型筛选和分页 |
| Usage | `GET /usage/stats` | 用量统计 |

## 已验证存在但客户端未启用的写操作

- 支付订单取消、重试、退款及退款查询。
- 套餐新增、修改和删除。
- 优惠码修改和删除。
- 公告修改和删除。
- 审计日志清理。

这些路由未因“后端存在”而自动开放。它们涉及不可逆业务状态或生产资金流程，需要权限确认、幂等设计和受控联调。

模型统计读取不等于模型配置管理。当前没有接入模型启停、渠道绑定或路由优先级写操作。

## 客户端兼容层

- 统一超时：读取默认 15 秒，调用方可覆盖为 30/60 秒。
- 仅 GET/HEAD 允许自动重试；POST/PUT/DELETE 不自动重试。
- 仅网络瞬断、429、502、503 重试，最多两次并尊重 `Retry-After`。
- 401 触发 SecureStore 凭据清理、TanStack Query 缓存清理与登录页跳转。
- 403/404/409/422/429/500/502/503 映射为中文可读错误。
- 服务端错误文本会截断并遮蔽 `admin-*` / `sk-*` 形式秘密。

## 部署差异风险

生产 Vexlune Hub 的精确后端提交未知。客户端契约来自上述权威上游源码及仓库现有接口实现；若生产部署版本较旧，页面会显示后端返回的错误或空状态，不会注入演示数据。当前环境没有生产管理员凭据，因此未执行真实 Hub 写入验证。
