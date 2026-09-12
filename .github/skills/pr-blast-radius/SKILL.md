---
name: pr-blast-radius
description: >-
  Rate the blast radius and auto-merge confidence of a strapi/strapi PR —
  could this land without a human review? Produces a structured risk report
  (blast-radius tier, confidence %, verdict) from the diff surface, dependency
  fan-out, CI status, test coverage, and PR metadata. Use whenever the user
  asks if a PR is safe to merge, mentions blast radius, auto-merge, merge
  confidence, unattended merging, or wants a risk assessment of any PR —
  even if they just paste a PR number or URL and ask "how risky is this?".
---

# PR blast radius

Rate how far a strapi/strapi PR's changes reach (**blast radius**) and how confident we can
be that merging it **without human review** would be safe (**confidence**). The output is a
report and a verdict — this skill never approves, merges, or comments on the PR. A human
acts on the verdict.

Why both numbers: blast radius measures *where the damage lands if the PR is wrong*;
confidence measures *how sure we are it isn't wrong*. A one-line fix in
`packages/core/database` can be low-risk in intent but systemic in reach — both dimensions
matter, and the verdict needs both.

## Gather evidence

Use `gh` from the strapi checkout (or the GitHub MCP if `gh` is unavailable). You need:

1. **Metadata** — `gh pr view <n> --json title,author,labels,additions,deletions,changedFiles,baseRefName,isDraft,reviews,mergeable`
2. **Files + diff** — `gh pr diff <n> --name-only` first; pull the full diff only for files
   the rubric flags as interesting (types, migrations, security paths).
3. **Checks** — `gh pr checks <n>`. Distinguish failing, pending, and skipped.
4. **Dependency fan-out** — for each touched package, count workspace dependents from the
   local checkout: `grep -rl '"@strapi/<pkg>"' packages/*/package.json packages/*/*/package.json`.
   A "contained" package imported by fifteen others is not contained.
5. **Test coverage signal** — does the diff touch test files alongside source? Do existing
   tests exercise the changed paths (same package's `__tests__`/`*.test.ts` reference the
   changed exports)? A source-only diff in a poorly tested area lowers confidence.

## Score it

Read [references/rubric.md](references/rubric.md) for the zone map, hard gates, and the
confidence deductions. In short:

- **Blast radius tier** = the highest zone any touched file lands in:
  `isolated` → `contained` → `broad` → `systemic`. Dependency fan-out can promote a tier,
  never demote it.
- **Hard gates** — conditions that force `HUMAN REVIEW` no matter the score (failing or
  absent CI, DB migrations, public type surface changes, security-sensitive paths, release
  machinery, first-time external contributors). Check these before bothering with arithmetic.
- **Confidence** — start at 100, apply the rubric's deductions. Round to 5s; don't
  manufacture precision the evidence doesn't support.

**Verdict = AUTO-MERGE** only when all hard gates pass, tier is `isolated` or `contained`,
and confidence ≥ 90. Everything else is **HUMAN REVIEW**.

## Report format

Always use this exact structure:

```markdown
# Blast radius: <PR title> (#<number>)

**Verdict: AUTO-MERGE | HUMAN REVIEW**
Blast radius: <isolated|contained|broad|systemic> · Confidence: <NN>%

## Why
<2-4 sentences: the dominant factors, in plain language.>

## Evidence
| Signal | Finding | Effect |
| --- | --- | --- |
| Diff surface | <packages/zones touched> | <tier contribution> |
| Fan-out | <N workspace dependents of touched packages> | <promotion or none> |
| CI | <green/red/pending, which checks> | <gate/deduction> |
| Tests | <coverage signal> | <deduction or none> |
| Author & meta | <who, size, labels> | <deduction or none> |

## Hard gates
<"All pass" or the specific gate(s) tripped.>

## What would change the verdict
<1-3 concrete items, e.g. "green CI re-run", "a test covering the changed branch".>
```

## Judgment notes

- When evidence is ambiguous, the tie always breaks toward `HUMAN REVIEW`. The cost of a
  false AUTO-MERGE (broken main, bad release) dwarfs the cost of a redundant review.
- Score what the diff *does*, not what the PR description says it does. A "chore: fix typo"
  that edits `packages/core/database/src/migrations/` is a migrations PR.
- Renames and moves inflate line counts without adding risk — check whether a large diff is
  mechanical before deducting for size.
- Generated files (lockfile alone, snapshots) follow the rubric's dependency rules, not the
  size rules.
