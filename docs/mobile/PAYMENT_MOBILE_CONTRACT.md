# Mobile payment action contract

The mobile checkout treats `POST /api/v1/payment/orders` as an order creation
operation, not a payment success signal. The response must contain an
actionable `pay_url`, `checkout_url`, `payment_url`, `redirect_url`, or a
provider deep link in `qr_code`. The app accepts HTTP(S) checkout URLs and the
known payment schemes `alipay`, `alipays`, `weixin`, `wxp`, `upi`, and
`intent`, then opens the value with the native `Linking` API.

`client_secret`, `intent_id`, opaque QR text, image data URLs, unsupported URL
schemes, and malformed values are not actionable in the current client. When
none of the supported values is returned, the app shows an explicit error,
refreshes the order list, and tells the user not to create a duplicate order.
It never reports payment success from order creation. The user can invoke
`POST /api/v1/payment/orders/verify` from the pending order list; the result is
rendered from the server status and refreshes the profile and subscription
queries.

Create and cancel requests carry one `Idempotency-Key` per user-confirmed
operation and reuse it for retries. A new deliberate operation receives a new
key. The backend must retain the durable request fingerprint and replay
contract described in `API_COVERAGE_MATRIX.md`.
