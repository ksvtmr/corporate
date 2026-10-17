# iClever Corporate — IT Audit, Fixes & Trilingual Localization Report

Date: 2026-10-16 · Branch: `claude/fervent-brahmagupta-4ecb0p` · Baseline commit: `9b7faa8`

## 1. Executive summary

The repository is a **frontend-only** React 18 + TypeScript + Vite SPA. There is no server, database or migration code in it: every API call is served by an in-browser **mock backend** (`src/mocks/`, data in `localStorage`), and `API_CONTRACTS.md` specifies the real backend. The audit therefore treated the mock backend as the system's server and fixed server-side rules there. A real backend must implement the same rules (see §11).

The baseline compiled and built, but the audit found **5 critical, 14 high and 20 medium** issues. The worst were an authentication bypass (any unknown email signed in as an administrator), client-side privilege escalation through the "Dev Role Switcher", no server-side authorization or tenant isolation, plaintext and default passwords, and a core assessment flow whose results were hardcoded. Localization did not exist: the language switcher changed a value nothing read, and 1,036 lines of hardcoded Russian UI text were measured.

All critical and high findings are fixed and covered by automated tests. The UI is fully localized into Russian, Kazakh and English (1,188 keys per language, CI-enforced), with a locale-aware model for dynamic content and locale-explicit AI calls. Verification: 85 unit/integration tests, 9 end-to-end browser scenarios, a responsive sweep of every page for all 4 roles in 3 languages at 360 px, typecheck and production build — all passing (§9).

## 2. Architecture and components inspected

| Area | What exists | Notes |
| :--- | :--- | :--- |
| Stack | React 18, React Router 6, TypeScript 5 (strict), Vite 5, Tailwind 3, lucide icons | Redux Toolkit is a dependency but is unused |
| Routing / RBAC | `App.tsx`, `RequireRole` | Rewritten around a shared capability matrix |
| Auth | `AuthContext`, `ApiClient` | Rewritten (server sessions, no client identity overrides) |
| "Backend" | `src/mocks/` fetch interceptor + localStorage DB | Rebuilt as a router with handlers, schema v2 and a migration |
| Pages | 18 feature pages + login/register | 3 used the API; 15 were local-state demos |
| Admin panel | Employees, departments, settings, reviews, integrity, reports, analytics | Same SPA, role-gated |
| AI features | RAG chat, AI track generation, AI question generation, AI grading | All were canned client-side text; now locale-aware API endpoints |
| Tests | 5 Playwright scripts hardcoded to `C:\Users\…` and the `msedge` channel | Not runnable outside the author's machine; replaced |
| CI | `tsc` + build only | Now also i18n completeness, unit tests and E2E |
| Deploy | Dockerfile (nginx), GHCR and GitHub Pages workflows | nginx security headers extended |

Journeys traced end to end: register → dashboard → directory; admin invite → invitation acceptance → employee sign-in; employee track → test → scoring → admin review queue; admin suspension → sign-in blocked; language switch → persistence → re-login.

## 3–4. Findings and fixes by severity

Every finding below has status **Fixed** unless stated otherwise. "Test" names the automated test that verifies the fix (U = Vitest, E = Playwright scenario).

### Critical

| # | Finding | Root cause | Fix | Verification |
| :- | :--- | :--- | :--- | :--- |
| C1 | **Authentication bypass**: any unknown email signed in as an org admin | Mock `login` synthesized an admin user when the email was not found | Credential check against stored salted hashes; one error for unknown email and wrong password; rate limiting | U `identity.test` "rejects unknown emails…"; E scenario 1 |
| C2 | `/identity/me` returned the admin profile for a missing or invalid token; tokens were forgeable (`mock-jwt-token-` + base64(email)) | Fallback-to-admin logic; deterministic tokens | Random 256-bit session tokens with expiry, stored server-side; logout revokes them; 401 on any inconsistency | U "/me requires a valid session", "expired sessions", "logout invalidates" |
| C3 | **Privilege escalation**: any user (including employees) could become admin via the Dev Role Switcher; the role was persisted in `localStorage` and re-applied on refresh | Identity and role were rewritten in React state with no server involvement | Removed client identity overrides. The demo switcher (mock mode only) performs a real login as the seed account; the server decides the role | E scenarios 5 (storage tampering) and 8 (server session role) |
| C4 | **No authorization or tenant isolation** in the API: any caller could list or modify every organization's members and departments; `switch-org` granted `org_admin` in any org; IDOR on `/members/:id` | Handlers ignored the session and organization | Every handler authenticates, scopes to the session's organization, enforces the RBAC matrix (API_CONTRACTS §16.2), checks the tenant header, and returns 404 for other tenants' records | U `corporate.test` RBAC suite, "cannot switch into an organization…", "tenant header" |
| C5 | Plaintext passwords in `localStorage`; invited and imported users got the known default password `Password123!` | Mock stored `password` and seeded invitees | Salted hashes only; invitees have **no** password until they accept the invitation; v1 data migrated | U "never stores plaintext passwords", "invite → accept → login", schema migration test |

### High

| # | Finding | Fix | Verification |
| :- | :--- | :--- | :--- |
| H1 | Registration created no membership (the new admin was missing from the directory), attached another tenant's department, and allowed duplicate emails | Atomic creation of user + org + active admin membership; 409 `USER_EXISTS`; server-side validation | U registration suite; E scenario 2 |
| H2 | Test results were hardcoded ("92%, passed") regardless of answers | Server-side scoring; answer keys and rubrics never sent to the client | U "scores from the submitted answers", "does not expose correct answers" |
| H3 | The timer never auto-submitted; the claimed autosave did not exist; the submit dialog always said "all answered" | Persisted deadline with auto-submit at 0; per-user/test draft autosave; real unanswered count | E scenario 6 (reload mid-test keeps answers) |
| H4 | Course completion was "recorded in the journal" but nothing was saved | Progress and completion API; test blocks are completed only by passing | U "track progress persists…" |
| H5 | Suspending/activating an employee changed local state only (lost on refresh; the user could still sign in) | `PATCH /members/:id` with a status-transition matrix; suspension revokes sessions | U member lifecycle; E scenario 7 |
| H6 | Bulk actions: empty target reported success, users could change their own role, promote to `platform_super_admin`, remove the last admin, and failures left partial updates | Validation plus an all-or-nothing transaction; self/last-admin guards; role-assignment rules | U "bulk actions are atomic", "HR cannot grant org_admin…" |
| H7 | Unknown endpoints returned a fake `success: true` | 404 / 405 responses; 500 without stack traces | U "returns 404 for unknown endpoints" |
| H8 | The API cache was shared across sessions: after switching user, the previous user's data was served for up to 15 s | Cache keyed by session and locale; cleared on every session change | Code review; E scenario 8 |
| H9 | Invitation links pointed to a nonexistent `/invite` route | Accept-invite page (set password, or prove ownership of an existing account); single-use 7-day tokens | E scenario 3 |
| H10 | Archiving a department deleted it and orphaned its members; member counts were hardcoded | Soft archive, refused while members or sub-departments exist (409); counts computed; names joined at read time | U departments suite |
| H11 | Settings update accepted arbitrary fields (including `id`); no validation; allowed domains not enforced | Field allow-list and validation (color, timezone, locale, domains); domains enforced on invite and import; audit log | U "validates input and ignores non-whitelisted fields", "invites enforce allowed domains" |
| H12 | CSV import: unvalidated roles (could import admins), duplicates, single-character formula stripping, imported users active with the default password | Per-row validation with localized error codes, idempotent updates, invited status | U "import validates rows…" |
| H13 | Client CSV export was not sanitized (formula injection, despite the README's claim) and exported only the current page | Uses the server export (tenant/team scoped, CWE-1236 safe); shared `sanitizeCsvCell` | U "export is tenant/team scoped and neutralises formula injection" |
| H14 | No localization: the switcher state was unused; 1,036 hardcoded Russian lines; `<html lang>` fixed to `ru` | See §6 | `npm run i18n:check`; E scenario 5 |

### Medium (all fixed)

1. Language preference was not persisted, and the browser language was not considered.
2. Pressing Escape in nested modals closed all of them; modals had no focus management, `aria-modal` or labelled title.
3. Timers ran inside state updaters (Reports, Materials), were never cleared on unmount, and double-ran in StrictMode.
4. Materials: "Merge" and topic-delete buttons did nothing; the access label always read "Whole organization"; category filters did not match upload categories; uploads were possible without a file.
5. Cohorts: new cohorts got a fake member; members were free text (an independent source of truth); removal had no confirmation.
6. Assignments: the cancellation reason was discarded; "assigned by" was a placeholder; the default due date was in the past; overdue status was static; test-vs-track type was guessed by the Russian substring «тест».
7. Analytics: the level and period filters did nothing; every figure was hardcoded.
8. Reports: downloads had fabricated content; "PDF" was a `.txt` file; "XLSX" was a TSV file with an Excel MIME type (Excel reports it as corrupt).
9. Flashcards: "Know" and "Repeat" behaved identically; user-created topics could not be filtered.
10. Tracks: AI generation ignored all inputs; numeric fields were unvalidated; the status filter was missing states.
11. Assessments: choice questions had no correct answer; AI ignored the requested count; new tests included the entire bank; "Preview" opened an unrelated test.
12. Employees: pagination was hidden (fixed size 50); the manager's team was filtered by the Russian substring «Инженер»; fake demo rows were shown on API errors; errors used `alert()`.
13. Departments and Settings: hardcoded "demo fallback" data hid API errors.
14. Mobile: no sign-out or organization switch in the mobile menu; the sticky header overlapped the wrapped top bar; filter rows and tabs overflowed at 360 px.
15. Trainers were shown the admin dashboard (with numbers they cannot access).
16. Dashboard KPIs were hardcoded, and a fake infrastructure card claimed "PostgreSQL + pgvector: ready".
17. The login form was prefilled with admin credentials.
18. No password visibility toggle or password confirmation on registration.
19. The AI chat invented answers with fake citations for unknown questions; prompt injection was not handled.
20. Found during testing: switching language and navigating immediately could drop the profile save, so the next sign-in restored the old language.

### Low (fixed)

Dead `GenericSectionPage` (unreachable; claimed "DB migrations deployed"); Windows-only test scripts; ineffective security `<meta>` tags (moved to nginx); `Input` ids derived from labels (duplicates); unused imports; React Router v7 warnings; missing `aria-label`s on icon buttons.

## 5. Security findings and remediation status

| Item | Status |
| :--- | :--- |
| Authentication, sessions, logout, expiry, rate-limited login (C1, C2) | Fixed (mock backend) |
| Role- and resource-level authorization, tenant isolation, IDOR (C3, C4) | Fixed (mock backend + shared RBAC matrix) |
| Credential storage and invitation flow (C5) | Fixed; mock uses salted SHA-256 — **a real backend must use argon2id/bcrypt** |
| Mass assignment, input validation, status transitions (H6, H11, H12) | Fixed |
| CSV formula injection (H13) | Fixed (export and import) |
| XSS | No `dangerouslySetInnerHTML`/`eval`; the print view escapes all values; CSP added in nginx |
| Open redirect after login | Fixed: strict allow-list for internal paths, including the backslash bypass from the react-router advisory (unit-tested) |
| Error leakage | API never returns stack traces; server messages are not shown verbatim (UI maps error codes to localized text) |
| AI prompt injection / data exposure | Mock screens common injection phrases, scopes retrieval to the tenant, limits input length and rate; clients validate response structure |
| Security headers | CSP, Permissions-Policy, nosniff, Referrer-Policy, X-Frame-Options in `nginx.conf` — **statically reviewed only** (no Docker daemon available to run `nginx -t`) |
| Session token in `localStorage` | **Open (architectural)**: with a real backend, use `HttpOnly`/`SameSite` cookies plus CSRF protection |
| Dependencies | **Open**: `npm audit` reports 14 advisories (2 critical, 6 high, 6 moderate). In-range patches applied (vite 5.4.21, vitest 3.2.7). The rest need semver-major upgrades: vite 8, vitest 5, tailwindcss 4 (build/dev tooling only, not shipped to browsers) and react-router 7 (runtime; the relevant open-redirect vector is mitigated in our code, and the SSR advisory does not apply to this SPA) |

## 6. Localization implementation

* **Framework**: a dependency-free engine in `src/kit/i18n/`. `I18nProvider` / `useI18n()` provide `t`, `rich` (inline markup without string concatenation), `lt` (dynamic content), `formatDate`, `formatNumber`, `formatPercent` and `formatFileSize` (`Intl` with `ru-RU`, `kk-KZ`, `en-US`), plus a collator-based `compare`. CLDR plural rules come from `Intl.PluralRules`.
* **Catalogues**: `src/locales/{ru,kk,en}/*.json`, 21 namespaces, **1,188 keys in each language**. One lazily loaded chunk per language (≈17–23 KB gzipped).
* **Language selection**: an RU/KK/EN switcher with endonym labels and `aria-pressed`, in the top bar and on login, registration and invitation pages. Switching applies instantly without a reload and updates `<html lang>` and `document.title`. Priority order: user profile preference (`PUT /identity/me/preferences`) → explicit choice on this device → organization default language → browser language → `ru`. Invalid values are normalized or rejected. A browser default never overwrites a saved choice.
* **Fallback policy**: explicit `FALLBACK_LOCALE = 'ru'` (the source language). Every miss is reported (dev console warning and the `window.__I18N_MISSING__` registry), and CI fails on any missing key, so the fallback cannot silently become permanent. Raw dotted keys are never rendered.
* **Dynamic content**: `LocalizedText = { ru?, kk?, en? }` for department names and descriptions, tracks, materials, questions, test content, AI knowledge-base answers, review criteria and seed records. The model is backward compatible with plain strings. Admin forms use `LocalizedTextInput` (per-language tabs, missing-language markers), and `TranslationFallbackMark` flags content shown in another language. Integrity event descriptions are stored as structured parameters and rendered in the reader's language. Server error codes are mapped to localized messages.
* **AI**: chat, track generation and question generation receive `locale` explicitly and return structured JSON, which the client validates. Malformed or failed responses never enter history or state, and the user can retry. AI grading stores its justification and criteria in all three languages.
* **Automated checks** (`npm run i18n:check`): missing and extra keys, empty values, interpolation-variable parity, required plural categories per locale, unknown static keys in code, and any hardcoded Cyrillic text in UI code. Unit tests additionally verify that every enum-driven dynamic key and every seed/fixture `LocalizedText` exists in all three languages.

**Translation coverage**: ru 1,188/1,188, kk 1,188/1,188, en 1,188/1,188 keys; 0 missing, 0 empty, 0 interpolation mismatches; all seed content complete in 3 languages. Not translated by design: personal names, company names, emails and technical terms (e.g. Junior/Middle/Senior, NATS, Clean Architecture). **Kazakh and English texts have not been reviewed by a native-speaker editor** (see §12).

## 7. Database and API changes (mock backend)

* Schema **v2** with a forward-only migration that keeps v1 records. It adds `organization_id` to departments and positions, converts passwords to hashes (default-password invitees lose their password), drops denormalized department names, and adds `sessions`, `audit_log`, `learning_progress`, `attempts`, `reviews` and `integrity_events`. Departments gain `name_i18n`/`description_i18n`; users gain `locale`; organizations gain plan/quota fields.
* New endpoints: `POST /identity/logout`, `PUT /identity/me/preferences`, `GET /identity/invitations/:token`, `POST /identity/invitations/accept`, `PATCH|DELETE /corporate/members/:id`, `GET /corporate/audit-log`, `GET /corporate/dashboard/summary`, `PUT /corporate/departments/:id` (existing route now implemented with validation), learning (`/learning/my/track|progress|complete`), assessment (`/assessment/tests/:id`, attempts, reviews, integrity events) and AI (`/ai/assistant/chat`, `/ai/tracks/generate`, `/ai/questions/generate`).
* Behavior changes: consistent `{ success, error: { code, message, details } }` envelopes with correct status codes (401/403/404/405/409/410/415/422/429); pagination meta with a 100-item cap; server-side sorting; idempotent attempt submission (`client_attempt_id`); multi-step changes run in transactions.
* **These endpoints should be added to `API_CONTRACTS.md`** before backend implementation (§13).

## 8. Files and modules modified

151 files changed (103 added, 42 modified, 7 removed; +17.4k/−8.9k lines excluding the lockfile).

* New: `src/kit/i18n/*`, `src/locales/**`, `src/kit/auth/{permissions,demo}.ts`, `src/kit/api/errors.ts`, `src/kit/components/{ConfirmDialog,States,LocalizedTextInput}.tsx`, `src/kit/hooks/usePersistentState.ts`, `src/kit/forms/validation.ts`, `src/kit/export/csv.ts`, `src/mocks/{db,http,dto,audit,crypto}.ts`, `src/mocks/handlers/*`, `src/mocks/data/content.ts`, `src/demo/*`, `src/pages/AcceptInvitePage.tsx`, `scripts/check-i18n.mjs`, `e2e/run.mjs`, test suites, `AUDIT_REPORT.md`.
* Rewritten: all 18 pages, `App.tsx`, `main.tsx`, `AppLayout.tsx`, `AuthContext.tsx`, `RequireRole.tsx`, `client.ts`, `Modal.tsx`, `Toast.tsx`, `FileUploader.tsx`, `src/mocks/{adapter,index}.ts`, `seed.ts`.
* Removed: `src/mocks/store.ts`, `src/pages/GenericSectionPage.tsx`, five Windows-only test scripts.
* Config: `package.json` (scripts; dev deps vitest, jsdom, @testing-library; vite patch bump), `vite.config.ts` (test config), `.github/workflows/ci.yml`, `nginx.conf`, `index.html`, `Makefile`, `README.md`.

## 9. Tests executed and results (all actually run in this environment)

| Check | Command | Baseline | Result |
| :--- | :--- | :--- | :--- |
| Typecheck | `npm run typecheck` | pass | **pass** |
| Translation completeness | `npm run i18n:check` | n/a (1,036 hardcoded lines) | **pass** (1,188 × 3 keys, 1,031 static references checked) |
| Unit / integration (Vitest) | `npm test` | none | **85 / 85 pass** (8 files: mock backend identity / corporate / learning, i18n engine, catalogues and seed content, RBAC and utilities, UI language switching) |
| Production build | `npm run build` | pass (224 KB main) | **pass** (221 KB / 70 KB gz main; 17–23 KB gz per locale; mock backend chunk loaded only in demo mode) |
| E2E (Chromium) | `npm run test:e2e` | not runnable | **9 / 9 scenarios pass, 0 browser console errors** |
| Responsive / i18n sweep | ad-hoc Playwright script (not committed) | — | **0 problems**: every page × 4 roles × 3 languages at 360 px — no horizontal overflow, no missing keys, no console errors |

E2E scenarios: (1) redirect to login and localized rejection of wrong/unknown credentials; (2) company registration, refresh persistence, isolated directory, sign-out; (3) admin invite → immediately visible → persists after refresh → invitee accepts → single-use link; (4) employee blocked from admin routes even after tampering with `localStorage`; (5) RU → KK → EN across 13 admin pages, persistence across reloads and re-login, no missing keys; (6) English assessment scored from real answers, autosave across reload, open answer appears in the admin review queue; (7) suspension blocks sign-in; (8) demo role switch produces a real server session; (9) mobile menu, navigation and sign-out with no horizontal scroll.

## 10. Build and type-check results

`tsc --noEmit`: 0 errors. `vite build`: success, no warnings besides chunk listings. The first E2E runs were affected by a stale preview server that kept the port (`ss` is not installed here, so cleanup silently failed). The runner now refuses to start if its port already answers and stops its own server reliably.

## 11. Remaining issues and external dependencies

1. **No real backend in this repository.** All server-side fixes (auth, RBAC, tenancy, validation, audit, scoring, AI guards) live in the mock. The real `identity-service`/`corporate-service` must implement the same rules and status codes; the mock tests (`src/mocks/__tests__`) can serve as an executable specification.
2. **Content modules have no server API** (materials, tracks, cohorts, assignments, question bank, flashcards, report history). They persist per organization in the browser and are labelled "Demo data" in the UI. Admin changes there are not visible to other users or browsers. Requires the content, assignment and reporting services from `API_CONTRACTS.md`.
3. **Mock data lives in each browser's `localStorage`.** Users, invitations and progress are not shared between devices in the demo.
4. Email delivery is simulated (invitation links are shown to the admin); XLSX export needs a server-side reporting service.
5. Token storage in `localStorage` and the dependency majors listed in §5.
6. nginx headers were not runtime-validated (no Docker daemon in this environment).
7. Kazakh and English translations need native-speaker review.

## 12. Manual verification still required

* Native-speaker review of `src/locales/kk/*.json` (and `en`) and of Kazakh content in `src/mocks/data/*` and `src/demo/fixtures.ts`.
* `docker compose up --build`, then check response headers (especially that the CSP doesn't block Google Fonts or the print view) and the `/healthz` endpoint.
* Screen-reader pass (NVDA/VoiceOver) on login, the employee directory, the test player and modals.
* GitHub Pages deployment under the `/corporate/` sub-path (invitation links and redirects use `BASE_URL`).
* The first CI run of the new `e2e` job (it installs Chromium via `npx playwright install --with-deps chromium`).

## 13. Recommended next steps

1. Implement the backend against `API_CONTRACTS.md` extended with the endpoints in §7. Use the mock handlers' rules and tests as acceptance criteria. Move sessions to `HttpOnly` cookies and add CSRF tokens.
2. Build the content, assignment and reporting services, and replace `usePersistentState` in the demo modules with API calls. Each page already isolates its data access in `src/demo/useDemoData.ts`.
3. Upgrade react-router to v7, then vite, vitest and tailwind to current majors, and re-run `npm run check` and `npm run test:e2e`.
4. Commission a professional Kazakh review, and add a glossary for terms that should stay untranslated.
5. Add ESLint (with `react-hooks` and `jsx-a11y`) to CI; the repository currently has no linter.
6. Remove the unused `@reduxjs/toolkit` and `react-redux` dependencies, or adopt them deliberately.
