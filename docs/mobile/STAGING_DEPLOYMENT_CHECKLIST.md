# Vexlune Hub non-production QA checklist

This is a test handoff for an already approved non-production Sub2API
environment. It is not an instruction to deploy `Hinln/sub2api`, change
production, run migrations, or add Cloudflare routes. The API baseline is
official Sub2API `v0.2.13` (`3040209f205472038c1ba745a1bedd2edd9053b1`).

## 1. Environment and accounts

- Record the non-production base URL and the exact server release. Production
  `hub.vexlune.com` is outside this checklist.
- Use disposable ordinary-user and administrator accounts. Revoke them after
  testing; do not use real customer/payment data.
- Keep captcha secrets, provider credentials and API keys out of the mobile
  repository, app bundle and logs.

## 2. Official API smoke test

Verify with a read-only request:

```text
GET /api/v1/settings/public
```

The response must be JSON 200 and expose only public feature flags and captcha
configuration. Verify the auth payloads against the official v0.2.13 fields:
`turnstile_token`, or Tencent `tencent_captcha_ticket` plus
`tencent_captcha_randstr`; Aliyun uses its documented `turnstile_token` field.

There is no official `/mobile/captcha/*` endpoint. The repository's
`verify-mobile-origin.sh` probe checks public settings, the three first-party
auth pages, and the dedicated `/mobile/turnstile` frontend route; it does not
route or validate a private backend bridge. The native app validates the
dedicated page's same-origin message tuple before forwarding a token.

## 3. Mobile acceptance

On a native iOS build, verify:

- provider widget/SDK proof is accepted by login, register and password reset;
- invalid or expired proof returns a visible auth error;
- `/auth/me` routes ordinary users and administrators correctly;
- 401 refresh is single-flight and failed refresh clears SecureStore/query data;
- user reads and administrator reads/writes reflect server responses, audit and
  confirmation requirements;
- API HTML challenges are classified before JSON parsing.

Do not perform balance, refund, key deletion, model probing or destructive tests
against production. Android is deferred and is not part of this checklist.

## 4. Stop/rollback

Stop the mobile rollout if the environment returns a private-only route,
unexpected DTO, captcha secret, HTML API envelope, or unverified write result.
Restore the last verified iOS build through TestFlight distribution. Escalate
server or Cloudflare issues to the environment owner; do not patch production
to bypass the failed check.
