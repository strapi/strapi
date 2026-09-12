# Commit message

```
chore(ai/skills): add breaking-changes policy gate for coding agents

Encodes the internal "Breaking Changes: Definition and Policy" doc as a
committed repo skill, so coding agents classify their own changes against
the policy before they finish, and stop for a human when they would break
the contract.

Nothing here is enforced. No CI wiring, no required check, no git hook.
This is a proposal for review — the intent is to agree the rules before we
gate anything on them.

What lands
- .ai/skills/breaking-changes/SKILL.md — the policy as agent instructions
- scripts/breaking-changes/ — `yarn check:breaking`, a triage script, with
  unit tests via `yarn check:breaking:test`
- package.json — those two script entries, nothing else

The gate
An agent touching a public surface must run the triage script, classify
every finding by tier, attempt a non-breaking redesign, and only then stop
and report. It is told explicitly not to commit a Tier 1 break, not to
shrink a change to make it feel smaller, and not to settle the four open
questions still in the policy draft — it escalates those instead.

The three tiers, unchanged from the policy:
- Tier 1, documented at docs.strapi.io: majors only, deprecate before
  removal, migration guide entry plus a codemod where feasible
- Tier 2, reachable internals (the `strapi` object, `@strapi/*` public
  exports, served endpoints incl. the Admin API): release-note callout,
  runtime warning where practical, prefer batching into a major
- Tier 3, internal (deep imports past the export map, patched source,
  admin implementation details, the database schema): any release, no
  notice

What the script does, and does not do
It is triage, not proof. It flags removed or renamed export subpaths,
removed named exports from package entry points, narrowed `engines`,
changed `peerDependencies`, removed CLI bins, content-type schema
attribute removals and type changes, newly required attributes, and
removed route paths. It cannot see a behaviour change inside a function
body, so a clean run means "nothing obvious", never "not breaking". Tier
labels are derived from file paths and are candidates, not verdicts.

Known limitation, worth a decision
"Documented equals supported" is the load-bearing rule of the policy, but
docs.strapi.io lives in strapi/documentation and cannot be checked from
this repo. The skill therefore makes the agent look up documentation
status and escalate when it cannot confirm. A generated manifest of
documented API surfaces would close this properly.

Run `yarn ai:sync` after checkout to link the skill into .claude/,
.agents/ and .cursor/.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KDQkiyx5B8P4pyMVAtfwZb
```

# PR description

````markdown
### What does it do?

Turns the internal _Breaking Changes: Definition and Policy_ doc into a committed repo skill, so coding agents (Claude Code, Cursor, and anything else reading `.ai/skills/`) classify their own changes against the policy before they finish, and stop for a human rather than shipping a break.

Three things land:

| Path                                   | What it is                                                                                                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.ai/skills/breaking-changes/SKILL.md` | The policy written as agent instructions: the definition, the three tiers, the "not a breaking change" list, twelve non-breaking redesign patterns, and a fixed escalation template |
| `scripts/breaking-changes/`            | `yarn check:breaking` — a public-surface triage script, plus `yarn check:breaking:test`                                                                                             |
| `package.json`                         | Those two script entries. No other change                                                                                                                                           |

The procedure an agent must follow: triage the diff → classify each finding by tier → **attempt a non-breaking redesign** → only if none exists, stop and report. It is told not to commit a Tier 1 break, not to reduce a change's scope to make it feel smaller, and not to decide the four open questions still in the policy draft.

The script flags removed or renamed export subpaths, removed named exports, narrowed `engines`, changed `peerDependencies`, removed CLI bins, schema attribute removals / type changes / newly-required attributes, and removed route paths.

**Two things it deliberately does not do.** It is triage, not proof — it cannot see a behaviour change inside a function body, so a clean run means "nothing obvious", not "not breaking". And it is not wired into CI: no required check, no hook, nothing blocks. That is the point of this PR — agree the rules first.

**What we need from reviewers.** Three decisions:

1. **Do the tier boundaries match what we actually intend to support?** Particularly the Admin API sitting in Tier 2, and `strapi.db.query` being Tier 1 today by virtue of being documented.
2. **"Documented equals supported" cannot be verified from this repo** — docs.strapi.io lives in `strapi/documentation`. The skill currently makes the agent look it up and escalate when it cannot confirm. Is that good enough for now, or do we want a generated manifest of documented surfaces?
3. **Do we want this enforced in CI later?** If so, note that failing on every finding would redden almost every PR that touches `packages/`, so it needs a severity split, and the existing blocking label `flag: 💥 Breaking change` is a natural hook for recording the human decision. Happy to raise that as a follow-up once the rules are settled.

### Why is it needed?

We have a policy, but the policy lives in Notion and the changes are made in this repo — increasingly by agents that never read it. This puts the rules where the work happens, in a form an agent is obliged to act on rather than a document it might have been shown.

It also gives us the three things the policy asks for and we currently do by memory: a consistent merge-time question for engineering ("does this change documented behaviour in a way that requires user action?"), a stable line for support between a regression on our side and unsupported usage on the user's, and a checkable list of the artifacts a sanctioned break owes users — deprecation, upgrade-guide entry, codemod.

### How to test it?

```bash
yarn ai:sync              # links the skill into .claude/ .agents/ .cursor/
yarn check:breaking:test  # 17 unit tests over the classification and diff logic
yarn check:breaking       # triage this branch against the merge-base with develop
```
````

Then try it against a deliberate break, e.g. delete an `exports` subpath from any `packages/**/package.json`, or remove an attribute from a `content-types/**/schema.json`, and re-run `yarn check:breaking`. Exit `0` means nothing on a public surface, `1` means findings to classify, `2` a usage error. `--json` gives machine-readable output; `--base=<ref>` overrides the base.

To review the skill itself, read `.ai/skills/breaking-changes/SKILL.md` against the Notion policy — the worked-examples table near the end is the fastest way to check whether the tier boundaries read the way we intend.

### Related issue(s)/PR(s)

Source policy: _Breaking Changes: Definition and Policy_ (Notion, still marked rough draft for internal review).

Follows the skills convention added in #26428 and #26431.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01KDQkiyx5B8P4pyMVAtfwZb

```

```
