# Vexlune Hub mobile rules

Before changing authentication, Turnstile, or `react-native-webview`, read:

- `docs/turnstile/official-requirements.md`
- `docs/turnstile/incident-report.md`
- `docs/turnstile/runbook.md`

The native app uses an email/password form and the same-origin `/mobile/turnstile` page. Do not load `/login` or `/register` inside the WebView, scrape a full webpage, mock a token, disable verification, or treat a missing token as proof that the widget did not load. Keep bridge messages bound to the current origin, action, request ID, nonce, and bridge version. Never log credentials, cookies, sessions, secrets, or token values.

Production deployment, service restarts, cache purges, Cloudflare rule/key changes, and destructive device-data operations require an explicit release approval. Local diagnostics and tests must record the first missing lifecycle event before a code change is made.
