---
name: breaking-changes
description: Use before finishing any change that touches a public surface of Strapi — package exports, published TypeScript types, REST/GraphQL routes, content-type schemas, configuration, CLI, provider interfaces, webhook or lifecycle payloads, or the supported environment matrix. Classifies the change against Strapi's breaking-change policy and stops for a human decision when it is a Tier 1 break. Trigger even if nobody said the words "breaking change".
---

# Breaking Changes: Definition and Policy

Strapi's engineering merge gate. Related: [AGENTS.md](../../../AGENTS.md), [CONTRIBUTING.md](../../../CONTRIBUTING.md), [git-conventions](../git-conventions/SKILL.md).

## The one rule

**Never introduce a Tier 1 breaking change without an explicit human decision.**

Tier 1 breaking changes ship in **major versions only**. Every PR here targets `develop`, which releases as a **minor**. So if your change is a Tier 1 break, you **stop and ask** — you do not merge it, you do not quietly reduce its scope to make it feel smaller, and you do not proceed on the assumption that it is probably fine.

The only exceptions are security and data-integrity fixes (see [Exceptions](#exceptions)), which are still a human decision, not yours.

---

## The definition

> A breaking change is a change to **supported behaviour** that requires users to **take action** when they upgrade, in order to keep their application working as it did before.

Both tests must be true:

1. **The behaviour was supported.** Supported means publicly documented at [docs.strapi.io](https://docs.strapi.io). If it is not in the public documentation, it is not part of the contract this policy protects.
2. **The change requires user action.** If Strapi handles it transparently — for example an automatic data migration run during upgrade — no action is required and the change is **not breaking**, however large it is internally.

Breaking an application that relies only on undocumented behaviour is not a breaking change under this policy. It may still deserve care (see Tier 2), but it is not a contract violation.

### "Documented" is narrower than it sounds

- **Reference documentation defines the contract.** Tutorials, guides and code examples _illustrate_ usage. The incidental details of an example — exact response ordering, error message wording — are not promises.
- **Only documented inputs, outputs and behaviours are covered.** An undocumented option on a documented method is internal.
- **Experimental, beta and future-flagged features are exempt.** The docs already say they can change or disappear. In this repo that maps to the `future` commit type and future flags.
- **Published TypeScript types for documented APIs are part of the contract.** A type change that breaks a user's build is a breaking change like any other. `@strapi/types` is therefore in scope.
- **The supported environment matrix** (Node.js, databases, admin-panel browsers) is part of the contract for as long as each version is supported _upstream_. Dropping a version upstream still supports is breaking. Dropping one that has reached upstream EOL is not — announce it in the release notes.

⚠️ **`docs/` in this repo is contributor documentation, not the contract.** The contract lives at [docs.strapi.io](https://docs.strapi.io) (separate repository). To establish whether behaviour is supported, **look it up on docs.strapi.io** — do not infer it from this repo, and do not guess. If you cannot determine documentation status, treat the surface as Tier 1 and escalate.

### Changing the docs changes the contract

- Removing documentation for a working feature **is a deprecation** of that feature and follows the same rules as removing the feature.
- Adding documentation for something **extends** the contract to cover it. If your PR documents a previously internal behaviour, say so — you have just promoted it to Tier 1.

---

## The three tiers

Strapi is self-hosted and customisation-first: users can reach almost every part of the codebase, by design. **Reachable is not supported.**

| Tier                        | What it is                                                              | What you owe                                                                                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 — Supported**           | Everything publicly documented                                          | Breaks ship in **majors only**, with deprecation ahead of removal where possible, plus a migration path: upgrade-guide entry and a codemod in the upgrade tool where feasible |
| **2 — Reachable internals** | Undocumented, but reached through surfaces Strapi intentionally exposes | Release-note callout; runtime deprecation warning ahead of the change where practical; **prefer batching into a major**                                                       |
| **3 — Internal**            | Everything else                                                         | Change freely, any release, no notice                                                                                                                                         |

**Tier 1 examples:** Content API (REST and GraphQL), Document Service (`strapi.documents`), webhook and lifecycle event payloads, documented plugin extension points, documented configuration files, the CLI, documented provider interfaces.

**Tier 2 examples:** the `strapi` application object, the public exports of `@strapi/*` packages, and HTTP endpoints the application serves — including the Admin API that powers the admin panel.

**Tier 3 examples:** deep imports past a package's export map, copied or patched source, admin-panel implementation details, and **the database schema**. Strapi reserves the right to change the schema and run automatic data migrations in any release; tooling that reads or writes Strapi's tables directly does so at its own risk.

### The Tier 2 / Tier 3 boundary is mechanical, not a judgement call

If a user reached it through the `strapi` object, a package's **public exports**, or a **served endpoint** → **Tier 2**.
If they had to go _around_ those surfaces to touch it → **Tier 3**.

### Popular Tier 2 APIs are a signal, not a constraint

Heavy community use of a reachable internal means Strapi is **missing a documented extension point**. The long-term answer is to design a supported equivalent and document it — not to freeze the internal one. If you hit this, note it for the team rather than abandoning the change.

---

## What is _not_ a breaking change

Do not block yourself on these:

- A **bug fix that restores documented behaviour**, even if an application depended on the bug.
- **Additive changes**: new endpoints, new **optional** fields in API responses or webhook payloads, new configuration options whose **defaults preserve existing behaviour**. Consumers are expected to tolerate additions.
- Changes Strapi **migrates automatically**, where the user takes no action.
- **Visual and UX changes in the admin panel** that do not alter documented customisation APIs.
- Dropping an environment version that has reached **upstream EOL**.
- **Performance characteristics.**
- Any change to **Tier 2 or Tier 3** surfaces — Tier 2 still gets its callout and warning.

---

## Procedure

Run this before you report a change as done — not after the human asks.

### Step 1 — Triage the diff mechanically

```bash
yarn check:breaking              # vs merge-base with develop, working tree included
yarn check:breaking --base=origin/develop
yarn check:breaking --json       # machine-readable, for your own parsing
```

The script is **triage, not proof**. It flags candidate public-surface changes: removed or renamed export subpaths, removed named exports from package entry points, narrowed `engines`, tightened `peerDependencies`, removed CLI bins, content-type schema attribute removals and type changes, route removals, config touches, provider-interface touches. Exit `0` means nothing to look at; exit `1` means **you must classify each finding by hand**. A clean run is not a licence to skip Step 2 — the script cannot see behaviour changes inside a function body.

### Step 2 — Classify every candidate

For each finding, in order:

1. **Which tier?** Apply the mechanical boundary above. Check documentation status on [docs.strapi.io](https://docs.strapi.io) — actually look, do not assume.
2. **Is it on the "not a breaking change" list?** If yes, done — proceed.
3. **Does it require user action on upgrade?** If Strapi migrates it transparently, it is not breaking. Be honest: "the user just has to update their import" **is** user action.
4. **Tier 2 or 3?** Proceed. For Tier 2, add the release-note callout and a deprecation warning where practical, and say so in your summary.
5. **Tier 1 and requires user action?** → **Step 3.**

### Step 3 — Try to make it non-breaking

Before escalating, attempt a redesign. Most Tier 1 breaks have a non-breaking shape:

| Instead of                                     | Do                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| Changing a function's behaviour                | Add an **opt-in option** whose default preserves today's behaviour        |
| Renaming an export, option or field            | **Add** the new name, keep the old one as an alias, deprecate the old one |
| Removing a parameter                           | Keep accepting it, ignore it, warn at runtime                             |
| Making an optional field required              | Keep it optional; derive or default it                                    |
| Tightening a type                              | Widen to a union, or add the strict type as a new export                  |
| Changing a response shape                      | Add the new field; leave the old one populated                            |
| Changing a config default                      | Keep the old default; document the new recommended value                  |
| Removing a route                               | Keep it, delegate to the new one, deprecate it                            |
| Dropping an upstream-supported Node/DB version | Wait for its upstream EOL                                                 |
| Behaviour that must change now                 | Put the new behaviour behind a **future flag** (`future` commit type)     |

If a non-breaking shape exists, **take it** — and mention the trade-off in your summary so the team knows a cleaner break is available in the next major.

### Step 4 — Stop and ask

If no non-breaking path exists, **stop before writing or finalising the change** and report using this template. Do not open a PR, do not commit the break.

```
🚨 BREAKING CHANGE — human decision needed

Change:        <one line>
Surface:       <e.g. @strapi/core public export `createStrapi`>
Tier:          1
Documented at: <docs.strapi.io URL, or "could not confirm">
User action:   <exactly what a user must do on upgrade>
Blast radius:  <who is affected, and how likely>

Non-breaking alternatives considered:
  1. <option> — rejected because <reason>
  2. <option> — rejected because <reason>

If we ship it, it needs:
  [ ] to wait for the next major (this PR targets develop = a minor)
  [ ] deprecation landed first, kept working ≥ 1 major
  [ ] upgrade-guide entry
  [ ] codemod in the upgrade tool (feasible? yes/no — why)
  [ ] release-note entry

I have not made this change. How would you like to proceed?
```

Then wait. If the human says ship it, ship it **with** the artifacts above — and only into a major.

---

## Deprecation and shipping rules

- **Deprecate before removing, whenever possible.** Mark it in the documentation, warn at runtime where practical, and keep the old behaviour working for **at least one major version** before removal.
- **A deprecation is not itself a breaking change** while the old behaviour keeps working. Deprecations can land in a minor. This is your most useful tool.
- **Every Tier 1 break ships with a migration guide entry** and, where feasible, a **codemod in the upgrade tool**.
- Users control when they upgrade. This policy pairs with the version support and EOL policy: one defines what an upgrade can cost, the other how long you can wait.

## Exceptions

**Security and data integrity outrank stability.** When fixing a vulnerability, or a bug that corrupts data, requires a behaviour change, it ships in whatever release reaches users fastest — including a patch. It is disclosed through the security policy and the release notes, and the forced change is kept as narrow as possible.

This is still not your call to make alone. Flag it as a security or data-integrity exception in your summary, keep the change minimal, and let a human confirm the release target. See [SECURITY.md](../../../SECURITY.md).

---

## Repo-specific notes

- **Target branch is `develop`, which ships as a minor.** A Tier 1 break can never land there unaided.
- **`@strapi/types`** is the single source of truth for shared types and is part of the Tier 1 contract. Widening is safe; narrowing breaks builds.
- **Package export maps** (`exports` in each `packages/**/package.json`) are the Tier 2/Tier 3 boundary made literal. Removing or renaming a subpath breaks every consumer that imported it — treat it as at least Tier 2 with a callout, and Tier 1 if that subpath is documented.
- **Entity Service is deprecated** in favour of the Document Service — but "deprecated" means it must keep working. Do not remove it.
- **Content-type `schema.json`** changes touch both the Content API shape (Tier 1) and the database schema (Tier 3). Split the analysis: the API shape is what matters.
- **`examples/`** apps are sandboxes and are not published — changes there are never breaking. Exception: `examples/complex` is the migration test fixture.
- **Commit type** follows [git-conventions](../git-conventions/SKILL.md). A sanctioned break is not a `chore`.

## Worked examples

| Change                                                                               | Verdict                                                                                           |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Add an optional `status` filter to a documented REST endpoint                        | **Not breaking** — additive                                                                       |
| Rename a documented Document Service option                                          | **Tier 1 breaking** — add the new name, alias the old, deprecate; escalate if the old one must go |
| Remove an undocumented option from a documented method                               | Internal → **not breaking**; still worth a release note if it was reachable                       |
| Change the return type of a `@strapi/types` export from `string` to `string \| null` | **Tier 1 breaking** — it breaks user builds                                                       |
| Delete an `exports` subpath from `@strapi/core`                                      | **Tier 2 minimum** — callout + warning; **Tier 1** if documented                                  |
| Change the admin panel's layout with no API change                                   | **Not breaking**                                                                                  |
| Rename a database column, with an automatic migration                                | **Not breaking** — Tier 3 plus transparent migration                                              |
| Drop Node 22 while it is still upstream-supported                                    | **Tier 1 breaking** — wait for upstream EOL                                                       |
| Fix a documented endpoint that returned the wrong field, which users worked around   | **Not breaking** — restores documented behaviour                                                  |
| Change a documented config default so existing apps behave differently               | **Tier 1 breaking** — keep the old default, document the new recommendation                       |

## Open questions in the policy

These are unresolved in the source policy. If your change lands on one of them, **escalate rather than deciding**:

1. The Query Engine API (`strapi.db.query`) is fully documented today, making it Tier 1 — is it staying there, or being deliberately un-documented in favour of the Document Service?
2. The Admin API is Tier 2 — is some subset (authentication, token management) destined for Tier 1?
3. Is one major version a long enough deprecation window given the major-release cadence?
4. Where does the public version of this policy live on docs.strapi.io?
