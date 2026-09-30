# ANTIGRAVITY.md — Antigravity Operational Memory & Token Preservation Protocols

> **Scope**: This file is read by Antigravity (the AI coding assistant) at session start.
> It captures session-persistent operational memory, token-budget disciplines, and
> workspace-specific behavioral contracts for the PayoutDelta repository.

---

## 1. ANTIGRAVITY OPERATIONAL MEMORY

### 1.1 Session Context
- **Repository**: PayoutDelta — cross-border remittance fee transparency tool.
- **Stack**: Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript strict.
- **Deployment target**: GitHub Pages (`basePath: '/payout-delta'`), static export.
- **Conversation ID binding**: This memory file is workspace-global; it is NOT scoped to a single conversation.

### 1.2 Accumulated Operational Learnings
- `patch_header3.mjs` and `patch_calc2.mjs` were temporary one-shot migration scripts.
  They have been removed. Do NOT recreate them.
- All data sync between `data/fees.json` ↔ `data/banks.ts` ↔ `data/regulatoryBanking.ts`
  is managed at build time through `lib/db.ts`. No runtime fetch or external sync is needed.
- `lib/corridorStatutes.ts` is a SERVER-ONLY seam — never import it from client components.
- `components/agencies/ExecutiveTreasuryReport.tsx` uses a deterministic FNV-1a reference ID;
  do NOT introduce `Date.now()`, `Math.random()`, or any non-deterministic source into it.
- All SVG icons live in `components/dashboard/Icons.tsx`. Zero external icon packages.

---

## 2. TOKEN PRESERVATION PROTOCOLS (MANDATORY)

These protocols are binding for every Antigravity session in this workspace.

### 2.1 Surgical Edit Discipline
- **SURGICAL EDITS ONLY.** Never rewrite an entire file to change a few lines.
- Always use `replace_file_content` (search/replace) or targeted line edits.
- Rewriting whole files wastes tokens and risks introducing unrelated regressions.

### 2.2 Zero File-Tree Discovery
- **DO NOT** run recursive `grep`, `glob`, `Get-ChildItem -Recurse`, or directory-tree
  discovery commands to locate files or symbols.
- All canonical file locations, exported function signatures, and data schemas are
  defined in `AGENTS.md` §3. Trust that registry without re-reading source files.

### 2.3 No Re-Reading Unmodified Files
- If a type, helper, or component is documented in `AGENTS.md`, treat its documented
  signature as ground truth — do NOT open and re-read the source file.
- Exception: read a file only when the task explicitly requires modifying it and the
  required change cannot be expressed from the documented signature alone.

### 2.4 No Runaway Task Lists
- Do NOT invoke recursive to-do list tools or chain open-ended discovery loops.
- Execute planned file edits directly and sequentially.
- Keep task scope to what was asked; do not expand scope without explicit instruction.

### 2.5 Zero-Dependency Rule (Runtime)
- **0 runtime chart, icon, animation, or PDF packages.**
- All charts and icons are hand-rolled inline SVG inside the component files.
- PDF/print output is driven by `@media print` CSS in `app/globals.css`.

### 2.6 Path Discipline
- Always use **root-relative** paths in `next/link` (e.g. `/invoice/`, `/dashboard/`).
- Never use relative `../` paths in link hrefs — basePath rewriting depends on root-relative.

---

## 3. VERIFY GATE

Before any commit, run:

```powershell
.\verify.ps1
```

A commit is only permissible when `verify.ps1` exits with **0 errors and 100% green**.
Never commit on a partial-green or skipped run.

---

## 4. COMMIT CONVENTIONS

```
<type>(<scope>): <imperative summary>
```

| Type | Use for |
|------|---------|
| `feat` | New feature or route |
| `fix` | Bug fix |
| `chore` | Maintenance, config, memory, scripts |
| `refactor` | Internal restructure (no behavior change) |
| `docs` | Documentation-only changes |
| `style` | CSS / formatting only |

- Scope examples: `calculator`, `invoice`, `ledger`, `header`, `memory`, `data`.
- Summary is lowercase imperative, ≤72 chars, no trailing period.

---

## 5. AGENT CONTRACT CROSS-REFERENCE

This file supplements — and does NOT duplicate — `AGENTS.md`.

| Concern | Authoritative file |
|---------|-------------------|
| Symbol registry & AST map | `AGENTS.md` §3 |
| UI shell components | `AGENTS.md` §4 |
| Infrastructure invariants | `AGENTS.md` §2 |
| Token preservation protocols | **This file** §2 (+ `AGENTS.md` §1) |
| Operational memory / learnings | **This file** §1 |
| Commit & verify gate | **This file** §3–4 |
