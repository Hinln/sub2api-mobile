# 管理 API 审计

## 认证与响应

- 管理基地址：`https://hub.vexlune.com`
- 管理路由前缀：`/api/v1/admin`
- 模型 API：`https://api.vexlune.com`，本管理客户端不向其发送推理请求。
- 当前 APP 认证：`x-api-key: <admin-api-key>`。
- 后端同时支持 `Authorization: Bearer <admin-jwt>`，但 APP 未实现账号密码/JWT 登录，因为上游移动端已验证 Admin API Key 路径且无需 Cookie。
- 标准响应：`{ code, message, reason?, metadata?, data? }`。
- 分页：`page`、`page_size`；响应 `items`、`total`、`page`、`page_size`、`pages`。
- Request ID：读取 `x-request-id` 或 `request-id` 响应头。

## 已接入接口

| 模块 | 方法与路径 | 用途 |
|---|---|---|
| Dashboard | `GET /dashboard/stats` | 总量、今日数据、RPM/TPM |
| Dashboard | `GET /dashboard/trend` | 小时/日趋势 |
| Dashboard | `GET /dashboard/models` | 模型分布（客户端已保留服务函数） |
| Dashboard | `GET /dashboard/snapshot-v2` | 聚合快照兼容入口 |
| Settings | `GET /settings` | 站点名称和只读配置 |
| System | `GET /system/version` | 版本与运行信息 |
| Users | `GET /users` | 搜索、状态、分页 |
| Users | `GET /users/:id` | 用户详情 |
| Users | `PUT /users/:id` | 启用/禁用 |
| Users | `POST /users/:id/balance` | set/add/subtract 三种明确余额语义 |
| Users | `GET /users/:id/usage` | 用户用量 |
| Users | `GET /users/:id/api-keys` | 用户 API Key 列表 |
| Accounts | `GET /accounts` | 搜索、状态、分页 |
| Accounts | `GET /accounts/:id` | 账号详情 |
| Accounts | `GET /accounts/:id/today-stats` | 今日用量 |
| Accounts | `POST /accounts/:id/test` | 账号测试 |
| Accounts | `POST /accounts/:id/refresh` | 刷新状态 |
| Accounts | `POST /accounts/:id/schedulable` | 暂停/恢复调度 |
| Accounts | `POST /accounts/:id/clear-error` | 清除错误 |
| Accounts | `POST /accounts/:id/recover-state` | 恢复状态 |
| Groups | `GET /groups` | 分组、平台、账号数、倍率 |
| Usage | `GET /usage` | 请求日志、筛选、分页 |
| Usage | `GET /usage/stats` | 用量统计 |

## 客户端兼容层

- 统一超时：读取 15 秒，调用方可覆盖为 30/60 秒。
- GET/HEAD 才允许自动重试；POST/PUT/DELETE 不自动重试。
- 仅对网络瞬断、429、502、503 重试，最多两次并尊重 `Retry-After`。
- 401 触发 SecureStore 凭据清理、TanStack Query 缓存清理与登录页跳转。
- 403/404/409/422/429/500/502/503 映射为中文可读错误。
- 服务端错误文本会截断并遮蔽 `admin-*` / `sk-*` 形式秘密。

## 版本差异风险

Vexlune 生产部署的精确后端提交未知；以上接口来自上游移动端及 `Wei-Shaw/sub2api@b74024c`。APP 对不支持的字段使用空状态，不伪造数据。真实管理员联调因环境无凭据未执行。
