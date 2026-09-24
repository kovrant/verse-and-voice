# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Next.js dev server, http://localhost:3000
npm run build          # production build (Do NOT run while dev server is running)
npm test               # vitest run (all tests)
npm run test:watch
npm run lint           # next lint (lint:fix to autofix import sorting / unused imports)
npm run format         # prettier --write .
npx tsc --noEmit       # TypeScript validation without emitting files
```

Single test file / single test:
```bash
npx vitest run src/lib/class-time.test.ts
npx vitest run -t "sorts AM slots"
```

Tests are colocated (`src/**/*.test.{ts,tsx}`) and cover pure computational helpers in `src/lib`.

---

## Working Style ("Ponytail" Mode)

Lazy senior dev: reuse existing helpers in `src/lib/`, prefer the shortest working diff, no unrequested abstractions or dependencies, fix bugs at the shared utility rather than just the reported call site. Mark deliberate trade-offs with `// ponytail: <ceiling and upgrade path>`. 

Full engineering principles: [okf/operations/development-standards.md](okf/operations/development-standards.md)

---

## Canonical Knowledge Base (Open Knowledge Format)

All architectural rules, domain logic, invariants, and database parity realities are maintained in the Git-native **Open Knowledge Format (OKF)** catalog. **Always consult the relevant OKF concept before making code changes:**

👉 **Master Catalog Index:** [okf/index.md](okf/index.md)

### Key Concept References:
* **Security & Auth:** [okf/architecture/rls-security-model.md](okf/architecture/rls-security-model.md) | [okf/architecture/auth-and-roles.md](okf/architecture/auth-and-roles.md) | [okf/architecture/dual-portal-routing.md](okf/architecture/dual-portal-routing.md)
* **Invariants:** [okf/architecture/timezone-and-dates.md](okf/architecture/timezone-and-dates.md) (PKT UTC+5, string time sorting, date-only parsing)
* **Realtime Protocol:** [okf/architecture/realtime-protocol.md](okf/architecture/realtime-protocol.md) (Presence, 0..1 normalized scroll ratio)
* **Domain Calculations:** [okf/domain/quran-progress-tracking.md](okf/domain/quran-progress-tracking.md) | [okf/domain/qaida-curriculum.md](okf/domain/qaida-curriculum.md) (`para_number = 0`)
* **Curriculum & Lifecycle:** [okf/domain/memorization-and-hifz.md](okf/domain/memorization-and-hifz.md) | [okf/domain/live-class-session.md](okf/domain/live-class-session.md) | [okf/domain/namaz-and-learning.md](okf/domain/namaz-and-learning.md)
* **Database & Parity:** [okf/database/schema-overview.md](okf/database/schema-overview.md) | [okf/database/migration-pipeline.md](okf/database/migration-pipeline.md) | [okf/database/schema-drift-and-parity.md](okf/database/schema-drift-and-parity.md)
* **Active Defects & Tech Debt:** [okf/operations/known-issues.md](okf/operations/known-issues.md) (supersedes `BUGS.md`)

### Pre-Commit OKF Enforcement
A Git pre-commit hook (`.githooks/pre-commit` via `scripts/check-okf-sync.mjs`) automatically blocks commits that introduce new route pages (`src/app/**/page.tsx`) or database migrations (`supabase/migration_*.sql`) unless corresponding documentation in `okf/` is also staged. When adding features, update `okf/` in the same commit.

---

## gstack
Use /browse from gstack for all web browsing. Never use mcp__claude-in-chrome__* tools.
Available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /design-shotgun, /design-html, /review, /ship, /land-and-deploy,
/canary, /benchmark, /browse, /qa, /qa-only, /design-review, /setup-deploy, /retro,
/investigate, /document-release, /codex, /cso, /autoplan, /careful, /freeze, /guard,
/unfreeze, /gstack-upgrade, /learn