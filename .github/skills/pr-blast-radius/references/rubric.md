# Scoring rubric

Three parts: the zone map (blast radius), the hard gates (binary blockers), and the
confidence deductions. Apply in that order.

## Zone map

A file's zone is decided by its path. The PR's blast-radius tier is the **highest** zone of
any touched file. Paths not listed default to `contained` — unknown reach is not low reach.

| Zone | Paths | Why |
| --- | --- | --- |
| **systemic** | `packages/core/types/`, `packages/core/utils/`, `packages/core/database/`, `packages/core/core/`, root `package.json` / `pnpm-workspace.yaml` / `tsconfig*` / build tooling, `.github/workflows/` | Everything downstream compiles against these. A regression here breaks every package, every user project, or the release pipeline itself. |
| **broad** | `packages/core/admin/`, `packages/core/strapi/`, `packages/core/permissions/`, `packages/core/data-transfer/`, `packages/cli/`, `packages/utils/`, root `pnpm-lock.yaml` (with source changes) | Shared runtime or the admin shell — many features sit on top, but the type system and data layer don't. |
| **contained** | One feature package: `packages/core/{content-manager,content-type-builder,content-releases,upload,email,review-workflows,openapi}/`, `packages/plugins/*`, `packages/providers/*`, `packages/generators/`, `packages/admin-test-utils/` | Failure is scoped to one feature. Verify with fan-out (below) — containment is an assumption, not a fact. |
| **isolated** | `docs/`, `examples/`, `*.md`, test files only (`__tests__/`, `*.test.*`, `tests/`), `.github/` non-workflow files, editor/lint config | Cannot affect runtime behavior of shipped code. |

**Fan-out promotion:** if a `contained` package has > 8 workspace dependents, promote the
tier to `broad`. Multiple `contained` packages touched in one PR (3+) also promote to
`broad` — coordinated cross-feature changes have coordination risk.

## Hard gates

Any single gate tripped → verdict is `HUMAN REVIEW`, regardless of tier or confidence.
State which gate in the report. These are things where being 95% sure is not good enough:

1. **CI not fully green** — any required check failing, pending, or missing. Skipped-by-path
   checks are acceptable only for `isolated`-tier diffs.
2. **DB migrations** — anything under a `migrations/` directory or altering schema logic in
   `packages/core/database`. Migrations are irreversible on user data.
3. **Public type surface** — changes to exported types/interfaces in `packages/core/types`
   or to a package's public `index.ts` exports. Breaks plugin authors silently.
4. **Security-sensitive paths** — auth, sessions, RBAC (`packages/core/permissions`,
   admin auth code), upload validation/sanitization, anything touching CORS/CSP defaults.
5. **Release machinery** — version fields, `lerna.json`/release configs, publish workflows,
   dist-tags.
6. **Untrusted author** — first-time contributor, or external contributor with no core-team
   interaction on the PR. (Bots: dependabot-only lockfile+manifest bumps are exempt from
   this gate but still subject to all others.)
7. **Draft or conflicted** — `isDraft`, or `mergeable` ≠ MERGEABLE.

## Confidence deductions

Start at 100. Apply every row that matches. Floor is 0; round the result to the nearest 5.

| Factor | Deduction |
| --- | --- |
| Tier `contained` | −5 |
| Tier `broad` | −25 |
| Tier `systemic` | −50 |
| Source changed with no test changes and no existing coverage of the changed paths | −25 |
| Source changed, existing tests cover the area, but none added/updated | −10 |
| > 400 changed lines (after discounting mechanical renames/generated files) | −10 |
| > 15 files touched | −10 |
| No linked issue and description doesn't explain intent | −10 |
| External author (known contributor, gate 6 not tripped) | −10 |
| Human approval already on the PR | +10 (cap at 100) |
| Dependency-only bump: patch/minor of a devDependency, lockfile consistent | +10 (cap at 100) |

Interpretation bands (for the report's tone, not the verdict — the verdict formula lives in
SKILL.md): 90–100 routine, 70–85 plausibly fine but wants eyes, < 70 needs a real review.

## Worked examples

- **Typo fix in `docs/`** — tier `isolated`, no gates tripped, CI green, confidence 100 →
  **AUTO-MERGE**.
- **Dependabot patch bump of a devDependency** — tier `contained` (manifests), gates pass
  (bot exemption), deductions −5, bonus +10 → 100 → **AUTO-MERGE**.
- **Bugfix in `content-manager` with a regression test, CI green, core-team author** —
  tier `contained`, −5, no other deductions → 95 → **AUTO-MERGE**.
- **Same bugfix but no test added, area has existing coverage** — 95 − 10 = 85 →
  **HUMAN REVIEW** (below 90).
- **Refactor touching `packages/core/utils`** — tier `systemic` → gate-free but −50 →
  **HUMAN REVIEW** (tier alone disqualifies).
- **Schema tweak in `packages/core/database`** — gate 2 → **HUMAN REVIEW**, always.
