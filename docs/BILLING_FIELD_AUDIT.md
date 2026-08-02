# Billing field audit

Date: 2026-08-02. Scope: the public Sub2API mobile-client contract available in this repository. No administrator credential was available in SecureStore, so no live Hub request or production write was made.

## Verified fields in the client contract

| Surface | Field | Meaning that may be safely displayed |
| --- | --- | --- |
| Dashboard trend / model stats | `cost` | A backend-provided cost aggregate with no verified promise that it is user billing or upstream cost. |
| Dashboard trend / model stats | `actual_cost` | A distinct backend-provided amount. The mobile UI labels it as actual billing only when it is explicitly present. |
| Usage stats | `total_cost`, `total_actual_cost`, `total_account_cost` | Distinct aggregates; callers must not collapse them into profit or an official list price. |
| Account daily stats | `cost`, `standard_cost`, `user_cost` | Distinct values. Their exact server semantics need a live, authenticated API response before any financial label is promoted. |

## Production UI policy

- Overview renders `today_actual_cost` as **实际计费** only when the Hub provides it.
- `today_standard_cost` is labelled **官方标准价格（参考）** and is never shown as revenue, actual billing, or upstream cost.
- Missing values render as `--`; no screenshot/demo value is substituted.
- Success rate only renders when the backend supplies a success or failed-request aggregate. A paginated historical error list is not used to infer a daily success rate.

## Backend gaps

The inspected public mobile contract does not prove a global batch-account write endpoint, a global API-key endpoint, order/recharge endpoints, or a canonical official-price field on the dashboard. These controls remain unavailable rather than guessed. A future authenticated, read-only API audit must record actual JSON examples, units, currency, and periods before enabling them.
