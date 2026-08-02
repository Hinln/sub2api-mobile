# 计费字段审计

日期：2026-08-02。范围：本仓库客户端契约与 `Wei-Shaw/sub2api@7e2e9ba05026b7126318aa0754c1afa0ac00bc58` 的管理员接口。当前环境没有可用于生产联调的管理员凭据，因此没有对真实 Hub 发起财务写操作。

## 可安全展示的字段

| 接口/页面 | 字段 | 当前安全口径 |
|---|---|---|
| Payment dashboard | `today_amount`、`total_amount`、`avg_amount` | 按币种返回的支付订单金额聚合；UI 标为今日实收、累计实收和平均订单金额，不直接声明为会计确认收入 |
| Payment dashboard | `today_count`、`total_count` | 支付订单数量 |
| Payment dashboard | `daily_series`、`payment_methods`、`top_users` | 支付日趋势、支付方式统计和高消费用户；均保留后端币种 |
| Payment orders | `amount`、`pay_amount`、`fee_rate`、`refund_amount`、`currency` | 订单标价、支付金额、费率、退款金额和币种，分别展示，不相互替代 |
| Dashboard trend/models | `cost` | 后端提供的标准计费聚合；不是已验证的上游结算成本 |
| Dashboard trend/models | `actual_cost` | 后端提供的实际扣费聚合；与 `cost` 分开显示，不视为上游成本 |
| Usage stats | `total_cost`、`total_actual_cost`、`total_account_cost` | 三个独立聚合字段；不能折叠成利润或官方价 |
| Account stats | `cost`、`standard_cost`、`user_cost` | 账号用量的不同计费口径；保持字段区分，缺失时显示 `--` |

## 利润为何不可计算

当前已验证接口没有提供完整、可对账的上游供应商结算成本。渠道采购价、阶梯折扣、退款、税费、汇率和结算周期也没有形成统一成本口径。因此：

- 不能把 `cost - actual_cost` 标为利润；这通常只反映标准计费与用户实际扣费的差异。
- 不能把 `total_account_cost` 在未确认语义和周期前直接当作全局上游成本。
- 财务中心可以展示支付实收和模型计费，但利润、毛利和毛利率必须显示为“不可计算”或 `--`。

## 生产 UI 规则

- Payment dashboard 的金额保留后端返回币种，不把不同币种直接相加。
- 概览仅在 Hub 返回 `today_actual_cost` 时展示“实际计费”。
- `today_standard_cost` 标为“官方标准价格（参考）”，不显示为收入、实收或上游成本。
- 缺失字段显示 `--`；不使用截图值、演示值或 0 代替。
- 只有后端明确返回成功/失败聚合时才显示成功率；不能从分页错误列表推算全日成功率。

生产化财务口径仍需要一次带真实响应样本的只读审计，记录 JSON、币种、单位、时区和统计周期，并由业务方确认会计含义。
