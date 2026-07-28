# MCP component-schema harness

A blind-agent harness for the question raised in [#27115](https://github.com/strapi/strapi/pull/27115):
**do the `data` JSON Schemas we generate for MCP `update_*` / `write_*` tools actually lead
tool-calling agents to safe payloads — and does the extra schema complexity confuse them?**

It is an evaluation tool, not a CI test. Nothing here runs on PRs; it is meant to be run by hand
when a schema-shape decision needs evidence instead of intuition.

## Why this exists

Two properties of the Document Service make component writes easy to get silently wrong:

1. **Repeatable components and dynamic zones are replaced wholesale.**
   `packages/core/core/src/services/document-service/components.ts` (`updateComponents` →
   `deleteOldComponents`) deletes any existing row not present in the incoming array. An agent
   asked to patch one item in a list reasonably sends only that item — and deletes its siblings.
2. **A component object without an `id` is delete-and-recreated, not patched.**
   Any field the agent does not resend is gone.

Neither is enforceable by schema constraints alone: a shorter array is also the _legitimate_ way
to delete items, and the correct minimum depends on document state that a per-tool schema is
resolved without. So the schema has to communicate the semantics, and the only way to know
whether it does is to put it in front of agents and look at what they send.

## Design

**Blind prompting.** The scenario agent is told only that it is calling `update_article`, given
the JSON Schema and the current document state, and asked for the `data` payload. It is never
told a schema design is under evaluation. That framing matters: an agent that knows it is being
evaluated reasons like a reviewer rather than a tool caller, and the result stops being
representative of real MCP usage.

**Mechanical grading.** Everything numeric is computed, never judged:

| Question                                                     | Decided by                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Does the payload validate?                                   | `ajv` against the variant's own JSON Schema                                                |
| Would it delete a row / lose a field / write an invalid row? | `applyPayload` in `validate.ts`, a small model of the Document Service component semantics |
| Does it express the requested change?                        | model (`achieves_intent`)                                                                  |
| Verbosity, hedging, clarification                            | model                                                                                      |

This split is the correction to an earlier round of this experiment, where a grading agent
decided validity and data loss itself. It contradicted itself on roughly a third of runs —
setting `collateral_loss: true` and then reasoning to the opposite conclusion in its free-text
notes ("Re-examining… this actually IS correct… I retract"). Those percentages had to be thrown
out. The rubric here also forces the model to write its evidence **before** the verdict field
and states that the verdict must follow from it, so a note can no longer disagree with its own
boolean.

`score.ts` prints a **Judgment vs mechanics** section listing runs the model called successful
that the mechanics found lossy — precisely the class of run a model-only rubric scores wrong.

## Layout

```
fixtures/content-type.ts   the article fixture (non-D&P; seo + repeatable links)
variants.ts                the schemas under test
scenarios.ts               S1–S6, their traps, and machine-checkable expectations
validate.ts                ajv + Document Service model — all mechanical grading
validate.test.ts           self-test for the grader (run this first)
gen-schemas.ts             CLI: print the schemas
prepare.ts                 CLI: bundle schemas + scenarios for the workflow
harness.workflow.js        the runner
score.ts                   CLI: raw runs → the numbers you can quote
```

### Variants

| key        | what it is                                                                              |
| ---------- | --------------------------------------------------------------------------------------- |
| `current`  | generated from the **real** `buildDataSchema` — always reflects the branch as it stands |
| `flat`     | frozen historical baseline: components as plain objects, no `id` anywhere               |
| `proposed` | frozen: the hand-rolled `anyOf` written for review comment #1                           |

`current` calls the real builder rather than embedding a copy, so the harness cannot silently
drift from the code it is testing. `flat` and `proposed` are frozen purely so a new run can be
compared against numbers recorded before the schema changed.

### Scenarios

| key | probes                                                                                      |
| --- | ------------------------------------------------------------------------------------------- |
| S1  | narrow patch of one nested field — can the agent avoid wiping siblings?                     |
| S2  | intentional full replacement — control; should not discriminate                             |
| S3  | patch one item in a repeatable list — does the untouched sibling survive?                   |
| S4  | clear an optional nested field — null-to-clear is undocumented; asking is a correct outcome |
| S5  | top-level + nested in one call                                                              |
| S6  | append to a repeatable list — are existing rows echoed back, and are ids invented?          |

Task wording is deliberately frozen. Changing a task string invalidates comparison with earlier
rounds.

## Running it

Check the grader first — every number depends on it:

```bash
npx tsx --test tests/mcp-schema-harness/validate.test.ts
```

Inspect what the branch currently advertises to an agent:

```bash
npx tsx tests/mcp-schema-harness/gen-schemas.ts current
```

Run the harness. A workflow script cannot import TypeScript, so the schemas are passed in as
data:

```bash
npx tsx tests/mcp-schema-harness/prepare.ts --wrap > /tmp/harness-args.json
```

Then, from an agent session:

```
Workflow({
  scriptPath: 'tests/mcp-schema-harness/harness.workflow.js',
  args: { ...bundleFromThatFile, variants: ['current', 'flat'], scenarios: ['S3','S6'], reps: 3 }
})
```

`args`: `variants` (default `['current','flat']`), `scenarios` (default all six), `reps`
(default 3), `model` (default: inherit the session model — set it to whatever tier you expect to
consume these tools).

Save the returned `results` array and score it:

```bash
npx tsx tests/mcp-schema-harness/score.ts runs.json --md
```

Component-union mistakes are probabilistic, so a single rep tells you little — 3 reps is the
minimum for a rate rather than an anecdote.

## What earlier rounds found

Run against the schema as it stood in July 2026, before the branch absorbed the fixes.

**Round 1** (36 runs, `flat` vs `proposed`):

| Scenario                       | `flat`                                                                               | `proposed`                                     |
| ------------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------- |
| S1 patch one nested field      | 2/3 safe only by resending everything; 1/3 dropped the `links` key                   | 3/3 correct                                    |
| S2 intentional full replace    | 3/3 correct                                                                          | 3/3 correct (does not discriminate)            |
| S3 patch one array item        | 3/3 correct                                                                          | 2/3 correct; 1/3 deleted the untouched sibling |
| S4 clear optional nested field | 3/3 broke it — all omitted `id:42`, 2/3 recreated a row missing required `metaTitle` | 3/3 used `id:42`                               |
| S5 top-level + nested          | 3/3 broke it — same id omission                                                      | 3/3 correct                                    |
| S6 array append                | 3/3 dropped ids on existing links                                                    | 3/3 preserved rows via id-only entries         |

`flat` reliably omits the component `id` because it has no `id` field to use, so S4/S5 produce
delete-and-recreate — and 4 of those 6 runs would have written a component row missing a
required field. The feared cost of `proposed`'s `anyOf` did not materialise: 18/18 schema-valid,
zero invented ids, zero clarification stalls, and replies were _shorter_ than `flat`'s, which
over-resends defensively because it cannot express "just this field".

**Round 2** (12 runs, after adding the wholesale-replace hint): literal item-dropping was
eliminated (0/12, from 1/3 in `proposed`/S3), but `flat` still churned ids in 4/6 runs — a
schema-shape problem no wording can fix. `proposed` agents adopted a shortcut the hint did not
anticipate: sending a bare `{"id": 8}` stub for untouched siblings rather than full contents.

**These tables were re-derived by reading raw payloads**, not taken from the grader's own
booleans. The round-1 headline percentages (11% vs 56%) came from the contradicted fields
described above and should not be quoted.

## Status of the underlying question

The branch has since moved: `buildComponentInputSchema` now emits the patch/create union for
real, and `WHOLESALE_REPLACE_HINT` points at the `id` branch. So `current` and `proposed` should
now behave closely, and `flat` is history rather than a live option.

The open question the harness was built to answer is narrower than it was:

- The bare `{"id": N}` keep-stub is now the natural way to preserve a row, and the real patch
  branch permits it (`required: ["id"]` only). Whether it is _guaranteed_ a no-op for every
  component type is not stated anywhere in the schema or the hint. If that assumption fails, it
  is the same silent-loss class this work set out to close — worth confirming against
  `updateOrCreateComponent` and then saying so explicitly in the wording.
- Dynamic zones have no `id` branch; their items are always recreated. They share the
  wholesale-replace hint, whose "or its full contents" fallback is doing the work for them.
