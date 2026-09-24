---
type: runbook
title: "Development Standards and Engineering Guidelines"
description: "Coding standards, 'Ponytail' mode principles, testing with Vitest, and formatting rules."
status: stable
verified: true
sources:
  - ".cursor/rules/ponytail.mdc"
  - "CLAUDE.md"
  - "package.json"
tags:
  - operations
  - development
  - standards
  - testing
  - ponytail
---

# Development Standards and Engineering Guidelines

Quran Academy follows the **"Ponytail" Lazy Senior Developer** philosophy: the best code is the code never written. Efficiency and simplicity always take precedence over clever or speculative abstractions.

---

## 🧗 The 7-Rung Solution Ladder

Before writing any new code or abstraction, stop at the first rung that holds:

1. **Does this need to be built at all?** (YAGNI — You Aren't Gonna Need It).
2. **Does it already exist in this codebase?** Reuse the helper in `src/lib/` or the existing component.
3. **Does the standard library / Web API already do this?** Use native methods.
4. **Does a native platform feature cover it?** Use HTML/CSS/browser primitives.
5. **Does an already-installed dependency solve it?** Leverage existing packages in `package.json`.
6. **Can this be one line?** Make it one line.
7. **Only then:** Write the minimum necessary working code.

---

## 🛠️ Commands & Tooling

```bash
npm run dev            # Start Next.js development server (http://localhost:3000)
npm run build          # Production build (Do NOT run while dev server is active)
npm test               # Run Vitest test suite
npm run test:watch     # Run Vitest in watch mode
npm run lint           # ESLint check
npm run lint:fix       # ESLint with automated import sorting & cleanup
npm run format         # Prettier formatting
```

### TypeScript Validation
There is no dedicated TypeScript-only script in `package.json`; run:
```bash
npx tsc --noEmit
```

---

## 🧪 Testing Standards (Vitest)

* **Location:** Tests are colocated beside the code under test (`src/**/*.test.{ts,tsx}`).
* **Scope:** Tests cover pure computational helpers (e.g., `class-time.test.ts`, `quran-progress.test.ts`, `scroll-sync.test.ts`), not React pages or Supabase network calls.
* **Runnable Checks:** Any non-trivial domain logic must leave a runnable check behind.

---

## 🔒 Code Rules & Invariants
* **No Google Fonts:** Fonts are self-hosted in `src/app/fonts/`. Never inject external font stylesheets.
* **Root-Cause Bug Fixing:** Fix bugs at the shared utility, not solely at the single reported call site.
* **Conscious Ceilings:** Deliberate trade-offs or temporary shortcuts must be flagged with a comment:  
  `// ponytail: <ceiling and upgrade path>`
