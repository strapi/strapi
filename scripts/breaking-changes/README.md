# breaking-changes

Triage for changes that land on one of Strapi's public surfaces.

```bash
yarn check:breaking                        # working tree vs merge-base with develop
yarn check:breaking --base=origin/develop  # explicit base
yarn check:breaking --json                 # machine-readable
yarn check:breaking --quiet                # findings only, no guidance footer
```

Exit codes: `0` nothing on a public surface, `1` findings to classify, `2` bad usage.

## What it is

A **candidate detector**. It reports changes that _could_ carry a breaking change, with a
candidate tier, so nothing on a public surface goes unexamined. It detects:

| Surface                        | What it catches                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| Export maps                    | removed or renamed `exports` subpaths, changed conditions                                       |
| Manifests                      | narrowed `engines.node`, changed or removed `peerDependencies`, removed `bin`, renamed packages |
| Published types & entry points | named exports that disappeared                                                                  |
| Content-type schemas           | removed attributes, changed attribute types, newly required fields, `kind` changes              |
| Routes                         | route paths that disappeared                                                                    |
| Everything else classified     | the file was touched, so classify it by hand                                                    |

## What it is not

It is **not proof that a change is safe**. It cannot see a behaviour change inside a
function body, a changed error message, a different default computed at runtime, or a
narrowed type expressed through inference. A clean run means "nothing obvious" — not
"not breaking".

Tier labels are heuristics from file paths. **Tier 1 requires the behaviour to be
documented at [docs.strapi.io](https://docs.strapi.io)**, which lives in another
repository and cannot be checked from here. Confirm documentation status before treating
a finding as a contract violation.

`docs/` in this repo is contributor documentation, not the public contract, so it is
excluded. `examples/`, `tests/`, `scripts/`, `__tests__/` and `dist/` are excluded too.

## The policy

Definitions, the three tiers, the "not a breaking change" list, non-breaking redesign
patterns and the escalation procedure: [`.ai/skills/breaking-changes/SKILL.md`](../../.ai/skills/breaking-changes/SKILL.md).

## Tests

```bash
yarn check:breaking:test
```

Layout follows `scripts/front/verify-translations`: pure logic in `surfaces.ts`, git
plumbing and reporting in `index.ts`, `node:test` specs in `__tests__/`.
