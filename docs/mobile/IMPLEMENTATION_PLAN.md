# Vexlune Hub Mobile Implementation Plan

Updated: 2026-10-02 (Asia/Shanghai)

## Repository identity and authority

- The production targets are `Hinln/sub2api-mobile` and `Hinln/sub2api`. Their `Hinln` repositories are the only sources that may receive implementation changes or releases.
- GitHub currently reports `Hinln/sub2api-mobile` with a fork flag and `ckken/sub2api-mobile` as its metadata parent. That hosting metadata does not change the product authority for this task: the requested prompt package and the `Hinln` repository are authoritative.
- `Hinln/sub2api` is a private, standalone repository (`fork: false`) and is the backend source of truth. Its Go module still uses the historical `github.com/Wei-Shaw/sub2api` import path; that path is an implementation compatibility detail, not repository ownership.
- `Wei-Shaw/sub2api` and any other public checkout are reference material only. They must not be used as a base branch, release source, or substitute for private backend behavior.

## Evidence baseline

- Mobile source: `Hinln/sub2api-mobile`, downloaded from public `main` ZIP. GitHub page reported latest commit `8431c44fc1f288aa01653aa10edfe8c2df19906f` on 2026-10-02. ZIP snapshots do not include `.git`, so local history is initialized from the snapshot and the source commit is recorded in `.codex-meta/SNAPSHOT.md`.
- Private backend: authenticated access to `Hinln/sub2api` is configured through GitHub CLI/keyring and the `main` snapshot is loaded at `repos/sub2api`. The local snapshot is the target baseline; its remote remains `https://github.com/Hinln/sub2api.git`.
- Public comparison: `Wei-Shaw/sub2api` snapshot is available at `repos/sub2api-upstream` for contract and security reference only. It is not the private target and will not be treated as the production backend.
- Prompt package omissions: `prompts/06` and `prompts/07`, plus the merged prompt file named by `MANIFEST.md`, are absent. Goal 6/7 requirements are taken from `prompts/08` and `prompts/09` and recorded in the gap report.

## Goal sequence

| Goal | Scope | Evidence | Status |
|---|---|---|---|
| 0 | Snapshot, branch, dependency/build baseline | this plan, `CURRENT_ARCHITECTURE.md`, command log | In progress |
| 1 | Real route and DTO audit | `API_COVERAGE_MATRIX.md`, `API_GAP_REPORT.md` | In progress; private backend unavailable |
| 2 | Shared design system, logo, API client, query/session boundaries | source changes + tests | Pending after baseline |
| 3 | Email/password auth, role routing, refresh, Turnstile WebView | source changes + tests | Pending |
| 4 | User workspace and real payment/usage/key flows | source changes + contract tests | Pending |
| 5 | Admin workspace and audited high-risk operations | source changes + contract tests | Pending |
| 6 | Private backend gaps, migrations, idempotency, audit | private checkout required | Blocked by missing private checkout |
| 7 | E2E, security and no-placeholder scan | environment + accounts required | Pending |
| 8 | Android/iOS builds, CI, release and rollback | signing/build environment required | Pending |

## Immediate execution order

1. Replace API-key boot/login with an email/password session layer while preserving server-owned authorization.
2. Add public settings, login/register/2FA/refresh/logout/me contracts with runtime validation and Cloudflare HTML detection.
3. Add a first-party Turnstile WebView gate with origin/nonce/type validation; never accept a secret or reuse a token.
4. Establish role-aware user/admin router groups and query-cache isolation.
5. Port existing admin read/write functions to Bearer JWT only after server contract verification; retain no API-key UI.
6. Add user navigation and feature modules only for endpoints confirmed in the private backend.
7. Once the private checkout is supplied, close every `BLOCKED_PRIVATE` row, implement migrations/tests, then run device and release gates.

## Required proof before completion

- Private backend commit and migration/test evidence.
- Contract tests against the private response envelope and error codes.
- Android preview APK and production AAB; iOS development/preview build evidence.
- Real Cloudflare configuration and Turnstile device flow evidence.
- QA, security, release and rollback documents with no unresolved rows.
