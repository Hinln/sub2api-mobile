# Mobile payment action contract

The mobile checkout treats `POST /api/v1/payment/orders` as an order creation
operation, not a payment success signal. The response must contain an
actionable `pay_url`, `checkout_url`, `payment_url`, `redirect_url`, or a
provider deep link in `qr_code`. The app accepts HTTP(S) checkout URLs and the
known payment schemes `alipay`, `alipays`, `weixin`, `wxp`, `upi`, and
`intent`, then opens the value with the native `Linking` API.

The official response can also return typed continuation results. For
`result_type=oauth_required`, the app resolves the root-relative
`oauth.authorize_url` against the configured Hub origin and opens it in the
system browser. It does not create a second order while the user completes
WeChat authorization. For `result_type=jsapi_ready`, the native app stops with
an explicit unsupported-flow error because WeChat JSAPI requires the WeChat
browser SDK. A response containing only Stripe `client_secret`/`intent_id` is
handled the same way until a native Stripe SDK is deliberately added; it is
never reported as a successful payment.

When the official server sets `alipay_mobile_precreate_deep_link=true`, the
`qr_code` value is a dynamic Alipay precreate payload rather than a URL. The
app wraps it as
`alipays://platformapi/startapp?saId=10000007&qrcode=<encoded-payload>` before
calling `Linking`, and falls back to a hard error if the payload is missing.

`client_secret`, `intent_id`, opaque QR text, image data URLs, unsupported URL
schemes, and malformed values are not actionable in the current client. When
none of the supported values is returned, the app shows an explicit error,
refreshes the order list, and tells the user not to create a duplicate order.
It never reports payment success from order creation. The user can invoke
`POST /api/v1/payment/orders/verify` from the pending order list; the result is
rendered from the server status and refreshes the profile and subscription
queries.

The client may attach one stable `Idempotency-Key` to a user-confirmed
operation only when the target server documents that field. Official Sub2API
v0.2.13 does not make the private durable fingerprint/replay coordinator a
mobile contract. If a write times out without an official replay guarantee,
query the order before offering a retry and never assume a duplicate is safe.
