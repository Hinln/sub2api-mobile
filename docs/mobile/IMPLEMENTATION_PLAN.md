# Vexlune Hub Mobile Implementation Plan

Updated: 2026-10-04 (Asia/Shanghai)

Release contract: official Sub2API `v0.2.13` tag
(`3040209f205472038c1ba745a1bedd2edd9053b1`). Production is unchanged; the
private Hinln backend checkout is not a release dependency.

## Repository identity and authority

- The production targets are `Hinln/sub2api-mobile` and `Hinln/sub2api`. Their `Hinln` repositories are the only sources that may receive implementation changes or releases.
- `Hinln/sub2api` is an independent repository. GitHub currently reports `Hinln/sub2api-mobile` as a fork of `ckken/sub2api-mobile`; it is not a fork of the official `Wei-Shaw/sub2api` repository. That hosting metadata does not change the product authority for this task: the requested prompt package and the `Hinln` repository are authoritative.
- The official `Wei-Shaw/sub2api` `v0.2.13` tag is the backend API contract for this mobile release. The private `Hinln/sub2api` checkout and local hardening branches are reference material only and must not be deployed or treated as the mobile release backend.

## Evidence baseline

- Mobile source: `Hinln/sub2api-mobile`, downloaded from public `main` ZIP. GitHub page reported latest commit `8431c44fc1f288aa01653aa10edfe8c2df19906f` on 2026-10-02. ZIP snapshots do not include `.git`, so local history is initialized from the snapshot and the source commit is recorded in `.codex-meta/SNAPSHOT.md`.
- Backend contract: official `v0.2.13` tag commit `3040209f205472038c1ba745a1bedd2edd9053b1`; no backend PR, migration or production deployment is part of this release.
- Prompt package omissions: `prompts/06` and `prompts/07`, plus the merged prompt file named by `MANIFEST.md`, are absent. Goal 6/7 requirements are taken from `prompts/08` and `prompts/09` and recorded in the gap report.

## Goal sequence

| Goal | Scope | Evidence | Status |
|---|---|---|---|
| 0 | Snapshot, branch, dependency/build baseline | independent Git branches, lockfiles and environment audit | Complete locally |
| 1 | Real route and DTO audit | `API_COVERAGE_MATRIX.md`, `API_GAP_REPORT.md` | Complete from authenticated private checkout |
| 2 | Shared design system, logo, API client, query/session boundaries | unified V Logo, Bearer client, cache clearing, tests | Complete locally |
| 3 | Email/password auth, role routing, refresh, provider captcha proof and native agreement notice | source changes + mobile tests; official v0.2.13 contract audit | Client alignment and staging pending |
| 4 | User workspace and real payment/usage/key flows | real endpoint screens + transport retry/idempotency boundary; provider replay semantics remain server-owned | Complete in source; provider sandbox pending |
| 5 | Admin workspace and audited high-risk operations | existing admin routes migrated to Bearer JWT; no API-key UI | Complete in source; staging role/step-up pending |
| 6 | Official backend contract and unsupported-gap audit | official v0.2.13 route/DTO review; no private migration or bridge deployment | Contract audit complete; unsupported controls remain gated |
| 7 | E2E, security and no-placeholder scan | QA/security reports and `scripts/verify-production-scan.sh` | Complete locally; staging accounts pending |
| 8 | iOS build, release and rollback | Checked-in native Xcode workspace and runbooks | iOS local archive/IPA verified; Android deferred; TestFlight remains external |

## Immediate execution order

1. Replace API-key boot/login with an email/password session layer while preserving server-owned authorization. **Done in the mobile source; official-contract alignment remains a release gate.**
2. Add public settings, login/register/2FA/refresh/logout/me contracts with runtime validation and Cloudflare HTML detection. **Done.**
3. Use the official v0.2.13 provider captcha fields from public settings; show the agreement in the native bottom notice and synchronize it only when the user submits login or registration; never accept a secret, invent a nonce, or depend on a private mobile bridge. **Contract alignment pending.**
4. Establish role-aware user/admin router groups and query-cache isolation. **Done.**
5. Port existing admin read/write functions to Bearer JWT only after server contract verification; retain no API-key UI. **Done.**
6. Add user navigation and feature modules only for endpoints confirmed in the official v0.2.13 contract. **Source audit pending for any private-only extension.**
7. Run the remaining non-production/device and TestFlight gates; do not mark deployed evidence complete from source inspection alone.

## Required proof before completion

- Contract tests against official v0.2.13 response envelopes, auth proof fields and error codes.
- iOS development/preview build evidence from the checked-in Xcode workspace; Android preview/production artifacts are deferred until that scope is reopened.
- Real non-production provider captcha and device-flow evidence; no production Cloudflare change is implied.
- QA, security, release and rollback documents with no unresolved rows.
