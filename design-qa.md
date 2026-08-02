# Hub Vexlune 1.0.2 Design QA

Date: 2026-08-02 (Asia/Shanghai)

## Scope

- Reference screens: Overview, Users, Upstream Accounts, More.
- Verified viewports: 375 × 667, 393 × 852, and 430 × 932.
- Verified flows: branded login, login failure feedback, four primary tabs, request-log routing, operational capability pages, filters, and detail sheets.
- Comparison artifact: `artifacts/design-qa/reference-vs-implementation.png`.
- Accepted implementation screenshots: `artifacts/screenshots/<viewport>/`.

## Reference comparison

| Area | Result | Notes |
| --- | --- | --- |
| Visual foundation | Passed | Light gray-purple background, white rounded cards, purple brand accent, soft shadows, green success and red failure states match the supplied direction. |
| Information hierarchy | Passed | Large iOS-style titles, supporting subtitles, search fields, filter pills, card lists, status badges, and fixed tab bar are consistent across the product. |
| Overview | Passed | Hub/API state, segmented overview/today control, eight core metrics, model distribution, four-series Token trend, and recent calls are present and API-driven. Compact iPhone widths use a two-column metric grid to keep values readable; content order and visual semantics remain aligned with the reference. |
| Users | Passed | Add action, search, status filters, balance/concurrency/API-key summary, and status cards closely match the reference composition. |
| Accounts | Passed | Add action, search, four status filters, summary card, scheduling state, and account cards match the supplied direction without inventing success-rate data. |
| More | Passed | Operations/System/Configuration sections, icon tiles, separators, card grouping, and four-tab navigation match the reference. Entries now open verified real-API pages. |
| Responsive behavior | Passed | No horizontal overflow at any tested viewport; fixed navigation remains visible and content remains scrollable. |

## Interaction and browser verification

- In-app Browser rendered the production web export at a 393 × 852 viewport.
- Login title is strictly `Hub Vexlune`; the old `Vexlune` title is no longer accepted by the test.
- Invalid network login displays the actionable Chinese message: `无法连接 Hub，请检查网络、HTTPS 证书或管理地址`.
- An isolated local Hub contract server was used only for browser QA; no production data was written.
- Successful login opened Overview and exposed exactly four primary tabs: Overview, Users, Accounts, More.
- Users and Accounts rendered deterministic API data and correct selected-tab states.
- More exposed Finance, Orders, Plans, Promo Codes, Request Logs, Exceptions, Audit Logs, Announcements, Groups, Model Analytics, Security, and System Settings.
- Finance opened from More and rendered real-contract payment totals, trend data, model billing data, empty states, and the explicit profit-calculation boundary.

## Automated evidence

- TypeScript: passed.
- ESLint: passed.
- Vitest: 5 files / 28 tests passed.
- Expo Doctor: 18/18 passed.
- Expo web production export: passed.
- Playwright visual and interaction suite: 4/4 passed without retry on the final run.
- Browser console errors during the Playwright acceptance suite: 0.
- Horizontal overflow checks: 0 failures.

## Findings closed during QA

- P1: Login and biometric-lock screens retained the old brand name. Fixed and re-verified.
- P1: More/About still described newly integrated operating APIs as unavailable. Fixed and re-verified.
- P2: Browser network failures exposed raw `Failed to fetch` text. Fixed with actionable localized guidance and a regression test.
- P2: E2E navigation still assumed the removed primary Logs tab. Replaced with the four-tab contract and More → Request Logs flow.

## Remaining severity audit

- P0 findings: none.
- P1 findings: none.
- P2 findings: none.

final result: passed
