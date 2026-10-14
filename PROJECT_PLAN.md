# iClever Corporate Frontend — Master Project Plan

## Architecture & Workspaces Overview

```
corporate/
├── packages/
│   ├── iclever-frontend-kit/           # Shared theme, UI kit, auth, api-client, permissions, i18n
│   └── iclever-corporate-web/          # The Corporate Application (routes, features, Redux store)
├── mocks/                              # MSW (Mock Service Worker) handlers & entity fixtures
├── package.json                        # Monorepo workspaces definition
├── PROJECT_PLAN.md                     # This plan
└── API_CONTRACTS.md                    # Complete REST API specification
```

---

## Sprints & Epics Decomposition (All Complete 🟢)

### 🟢 Sprint 1: Monorepo Scaffolding, Design System & Core Foundation
* **Epic 1.1: Workspace Infrastructure & Tooling** [DONE]
  * Monorepo setup with npm workspaces (`packages/*`).
  * TypeScript path aliases (`@iclever/frontend-kit`), Vite configuration, ESLint/Prettier setup.
* **Epic 1.2: Design System Tokens & Base UI Kit (`iclever-frontend-kit`)** [DONE]
  * Centralized token module in `src/kit`: colors (neutral palette + indigo accent, light/dark mode), typography scale, spacing, radii (8–12px), soft shadows.
  * Base components: `Button`, `Input`, `Table`, `DataTable` (sort/filter/pagination), `Modal`, `Card`, `Tabs`, `Badge`, `Toast`, `FileUploader`.
* **Epic 1.3: Auth, RBAC & Role Switcher** [DONE]
  * `AuthContext` with session state and mock JWT handling.
  * `usePermissions()` hook and `<RequireRole>` guard component supporting 5 roles:
    1. *Organization Admin / Head HR*
    2. *HR / Learning Manager*
    3. *Manager*
    4. *Corporate Trainer / Content Owner*
    5. *Employee*
  * Dev Role Switcher bar for instant QA switching across all 5 roles.
* **Epic 1.4: i18n Setup (ru, kk, en)** [DONE]
  * Language switcher for `ru`, `kk`, `en`.
* **Epic 1.5: MSW & Data Shapes Modeling** [DONE]
  * Mock adapter with typed interceptors and entity fixtures.

---

### 🟢 Sprint 2: Core Organization & Personnel Modules
* **Epic 2.1: Auth & Shell (Section 6.1)** [DONE]
  * Login screen with email/password and demo accounts.
  * AppShell layout: role-scoped sidebar nav, top bar (org switcher, dev role switcher, language switcher, user menu, notification bell).
* **Epic 2.2: Role-Aware Dashboard (Section 6.2)** [DONE]
  * Employee view: active assignments, deadlines, progress, weak topics, XP badges, recommendations, player launch.
  * HR/Admin view: org completion rate, overdue rate, pass rate, problem topics, recent activity feed.
  * Manager view: scoped strictly to own engineering team.
* **Epic 2.3: Employees Management (Section 6.3)** [DONE]
  * DataTable with search, filters, sorting, pagination.
  * Employee detail modal, email invite, one-time link generator modal, bulk operations.
* **Epic 2.4: Departments & Org Structure (Section 6.4)** [DONE]
  * Org structure tree/table (departments, teams, positions, managers).
  * Department CRUD and constraint enforcement.

---

### 🟢 Sprint 3: Content, Materials & Learning Tracks
* **Epic 3.1: Materials & Knowledge Base (Section 6.5)** [DONE]
  * Drag-drop file uploader with format validation.
  * Processing pipeline visualizer (`uploaded` → `queued` → `processing` → `ready_for_review` → `published`).
  * Material list with search, filters, topic editor, version diff, access level selector.
* **Epic 3.2: Learning Tracks Builder (Section 6.6)** [DONE]
  * Track list with filters (onboarding, compliance, role training, custom).
  * Track builder: block sequence editor (material, video, test, open question, flashcards, acknowledgment), transition rules, duration, pass thresholds.
  * AI-generate track flow (form → draft preview → edit → explicit publish action).
* **Epic 3.3: Cohorts Management (Section 6.7)** [DONE]
  * Cohort list & builder (manual, by department, by position, new hires).
  * Cohort membership management and progress tracking.

---

### 🟢 Sprint 4: Assignments, Assessments & Test Engine
* **Epic 4.1: Assignments & Deadlines Engine (Section 6.8)** [DONE]
  * Assignment list/table with status filters (`scheduled`, `assigned`, `in_progress`, `completed`, `overdue`, `cancelled`).
  * Create assignment flow (track/test + assignee/cohort, due date, priority, reminder rules).
  * Cancellation with audit reason dialog.
* **Epic 4.2: Question Banks & Assessments Builder (Section 6.9)** [DONE]
  * Question bank with 8 question types (single/multiple choice, true-false, short/open answer, matching, ordering, scenario-based).
  * Question editor & AI-generate questions flow.
  * Test builder: assemble from bank, timer, randomize, shuffle, integrity control toggles, versioning.
* **Epic 4.3: Test-Taking Experience (Employee-Facing) (Section 6.12)** [DONE]
  * Responsive track player with block navigation.
  * Interactive test player: timer, question navigation, autosave in-progress state, submit confirmation, results screen with topic breakdown & "evaluating" state for open answers.
* **Epic 4.4: Open Answer Reviews & Integrity Flags (Sections 6.10, 6.11)** [DONE]
  * Review queue with AI scores, confidence %, criteria match, approve/override/comment/cluster view.
  * Neutral integrity events panel (tab switch, focus loss, copy/paste, rapid answers) with HR resolution audit trail.

---

### 🟢 Sprint 5: AI Capabilities, Analytics & Settings
* **Epic 5.1: Flashcards & Spaced Repetition (Section 6.13)** [DONE]
  * Deck view, 3D card flip interaction, "Know" / "Repeat" buttons, interval scheduling indicator.
* **Epic 5.2: Corporate RAG AI Assistant (Section 6.14)** [DONE]
  * Employee-facing chat UI with context selector (single material / topic / track / all knowledge base).
  * Inline linked citations, "not enough context" fallback, clear conversation action.
* **Epic 5.3: HR Analytics & Export Reports (Sections 6.15, 6.16)** [DONE]
  * Multi-level analytics dashboard (org, dept, team) with KPI cards, department progress bars, and AI educational insights panel.
  * Reports generator: report type picker, format picker (PDF/XLSX/CSV), async job status UI, download simulator, audit log.
* **Epic 5.4: Organization Settings (Section 6.17)** [DONE]
  * Org profile, branding, allowed email domains, default language, timezone, limits display, notification toggles, retention policy.

---

### 🟢 Sprint 6: Quality Assurance & Definition of Done
* **100% Pass** on full end-to-end browser testing suite (`test_all_sprints.cjs`).
* **Zero build errors** on `npm run build` (`tsc && vite build`).
* Multi-language switcher (`ru`, `kk`, `en`).
* Dev Role Switcher allowing instant toggling between all 5 roles.

---

### 🟢 Sprint 7: Security Hardening, Query Optimization & Production API Contracts
* **Epic 7.1: Route-Level RBAC Protection & Access Denied Handler** [DONE]
  * `<RequireRole allowedRoles={[...]}>` component protecting all sensitive routes.
  * Dedicated `403 Forbidden` screen with role explanation and safe return to dashboard.
* **Epic 7.2: Sensitive Data Redaction & CSV Formula Injection Protection** [DONE]
  * Complete sanitization of `User` objects in API responses (zero password leakage).
  * CSV export sanitization (CWE-1236) prefixing dangerous formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with single quotes.
  * Safe CSV parser with row limits and email format validation.
  * Security meta tags in `index.html` (`nosniff`, `referrer-policy`, `X-XSS-Protection`).
* **Epic 7.3: Query Optimization, In-Flight Deduplication & Search Debounce** [DONE]
  * `useDebounce` hook integrated into search inputs (300ms threshold).
  * Active request token tracking preventing race conditions and stale data overwrites.
  * In-memory caching for idempotent `GET` requests (15s TTL) and automatic cache invalidation on mutations in `ApiClient`.
  * Concurrent in-flight request deduplication via promise sharing.
* **Epic 7.4: Route-Level Code Splitting (Lazy Loading)** [DONE]
  * `React.lazy` and `Suspense` for all 18 page routes, cutting initial bundle size by 50% (from 451 kB to 223 kB).
* **Epic 7.5: Master API Contracts & Multi-Tenancy Specification** [DONE]
  * Comprehensive expansion of `API_CONTRACTS.md` covering all 17 sections (full schemas, DTOs, query parameters, multi-tenancy validation rules, rate limiting, and RBAC matrix).
* **100% Pass** on full automated E2E browser verification (`test_verification_security_and_all.cjs`).
