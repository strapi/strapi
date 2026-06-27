# Agent 4 — `prebuild-install` deprecation deep dive

**Date:** 2026-06-27  
**Scope:** Fresh `create-strapi` installs (default SQLite)  
**Primary constraint:** No breaking changes for Strapi users (existing SQLite apps, create-strapi defaults, native install on Node 22–26).

Related: [`DEPENDENCY_REMEDIATION_PLAN.md`](../../DEPENDENCY_REMEDIATION_PLAN.md) Phase 9 · [`AUDIT_NPM_20260626.md`](../../AUDIT_NPM_20260626.md) § deprecation #5.

---

## Executive summary

The `npm warn deprecated prebuild-install@7.1.3` warning on fresh Strapi installs is **cosmetic today** — install succeeds and SQLite works. Strapi does **not** depend on `prebuild-install` directly; it arrives transitively through **`better-sqlite3`**, which is a **user-app dependency** scaffolded by `create-strapi-app`, not a dependency of `@strapi/database`.

**No Strapi-only change removes the deprecation warning today.** Every published `better-sqlite3@12.x` release (through **12.11.1**, latest on npm as of 2026-06-27) still lists `prebuild-install` as a runtime dependency and runs `"install": "prebuild-install || node-gyp rebuild --release"`.

**Recommended near-term stack (ranked):**

1. **Document** that the warning is upstream, harmless, and tracked — zero user impact.
2. **Bump template pin** `12.8.0` → `12.11.1` for Node 26 engine alignment and driver patches — **does not clear the warning** but is safe for new projects.
3. **Scaffold `allowScripts`** for `better-sqlite3` in `create-strapi-app` (npm users) before **npm v12** default-deny — prevents a future **functional** break, not a deprecation fix.
4. **Track / optionally contribute** to [WiseLibs/better-sqlite3#655](https://github.com/WiseLibs/better-sqlite3/issues/655) — the only path that actually drops `prebuild-install`.

**Do not pursue:** driver replacement, yarn/npm resolutions on `prebuild-install`, or fork — all high risk / no deprecation benefit.

---

## 1. What users see

```text
npm warn deprecated prebuild-install@7.1.3: No longer maintained.
Please contact the author of the relevant native addon; alternatives are available.
```

- Appears during `npm install` in any project with `better-sqlite3` (including default `create-strapi`).
- **Not** an npm audit vulnerability — deprecation metadata only.
- Install still completes; native addon loads via downloaded prebuild or `node-gyp` fallback.

---

## 2. Full dependency chain in Strapi

### 2.1 Runtime path (published app)

```text
User package.json
  └── better-sqlite3@12.x          ← direct dep (create-strapi scaffold or manual)
        ├── bindings@^1.5.0
        ├── prebuild-install@^7.1.1  → resolves to 7.1.3 (deprecated)
        └── install script: prebuild-install || node-gyp rebuild --release

@strapi/database (framework)
  └── knex@3.0.1
        └── client mapping: sqlite → better-sqlite3   (peer-like; not bundled)
```

**Important:** `@strapi/database` does **not** list `better-sqlite3` in `package.json`. The driver must be installed in the **application** `package.json`. Knex resolves it at runtime via:

```4:8:packages/core/database/src/connection.ts
const clientMap = {
  sqlite: 'better-sqlite3',
  mysql: 'mysql2',
  postgres: 'pg',
};
```

### 2.2 Strapi touchpoints

| Location                                                                            | Role                                                                                       |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `packages/cli/create-strapi-app/src/utils/database.ts`                              | Default SQLite driver pin: `'better-sqlite3': '12.8.0'`                                    |
| `packages/cli/create-strapi-app/src/utils/pnpm-config.ts`                           | Adds `better-sqlite3` to pnpm `allowBuilds` / `onlyBuiltDependencies` when SQLite selected |
| `packages/cli/create-strapi-app/src/utils/package-json.ts`                          | Writes pnpm config into scaffolded `package.json` (pnpm &lt; 10.26 only)                   |
| `packages/cli/create-strapi-app/templates/*/config/database.{ts,js}`                | Default `DATABASE_CLIENT=sqlite`, `.tmp/data.db`                                           |
| `packages/utils/upgrade/resources/codemods/5.1.0/dependency-better-sqlite3.json.ts` | Upgrade codemod target: `12.8.0`                                                           |
| `packages/utils/upgrade/resources/codemods/5.0.0/sqlite3-to-better-sqlite3.json.ts` | v4→v5 migration off `sqlite3` / `@vscode/sqlite3`                                          |
| `examples/*`, `tests/app-template`                                                  | Pin `better-sqlite3@12.8.0`                                                                |
| `packages/core/database/src/dialects/sqlite/`                                       | SQLite-specific schema, batch limits, pragmas — assumes Knex + better-sqlite3              |
| `packages/core/strapi/README.md`                                                    | Documents min driver: Node 22 → better-sqlite3@11.x, Node 24 → @12.x                       |

### 2.3 Monorepo dev chain

In this repo, `better-sqlite3` appears only under **examples** workspaces (not framework packages):

```text
strapi (root)
  └── examples/getstarted | empty | complex | kitchensink | kitchensink-ts
        └── better-sqlite3@12.8.0
              └── prebuild-install@7.1.x
```

Verified via `yarn why better-sqlite3` and `npm ls prebuild-install`.

### 2.4 Package managers at scaffold time

| PM                                   | Native build handling today                                                                                  | `prebuild-install` warning              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| **npm** (create-strapi default)      | Runs install scripts by default                                                                              | **Yes** — deprecation warn              |
| **yarn** (Berry/classic in monorepo) | Runs lifecycle scripts                                                                                       | **Yes**                                 |
| **pnpm**                             | Blocks unless allowlisted; create-strapi writes `allowBuilds` / `onlyBuiltDependencies` for `better-sqlite3` | **Yes** (deprecated dep still resolved) |

create-strapi **already** handles pnpm native builds; it does **not** yet scaffold npm **`allowScripts`** (see §5).

---

## 3. Can bumping `better-sqlite3` remove the warning?

**No.** Checked all 12.x releases on npm (2026-06-27):

| Version                 | `prebuild-install` dep | Install script                                     | Node engines |
| ----------------------- | ---------------------- | -------------------------------------------------- | ------------ |
| **12.8.0** (Strapi pin) | `^7.1.1`               | `prebuild-install \|\| node-gyp rebuild --release` | 20–25        |
| 12.9.0 – 12.10.1        | same                   | same                                               | 20–25        |
| **12.11.1** (latest)    | same                   | same                                               | **20–26**    |

`npm view prebuild-install deprecated` → _"No longer maintained… alternatives are available."_

The warning is triggered by npm reading **`prebuild-install`'s package metadata**, not by Strapi. Bumping Strapi's pin changes **which better-sqlite3 version** is installed, not whether that version depends on `prebuild-install`.

**Why bump anyway?**

- **12.11.1** adds explicit **Node 26** to `engines` (Strapi supports Node ≤26).
- Patch releases may include SQLite / ABI fixes (still semver-compatible within 12.x).
- Upgrade codemod (`5.1.0/dependency-better-sqlite3.json.ts`) should stay aligned.

**User impact of template-only bump:** New projects get `12.11.1`; existing projects keep their pin until they upgrade. No API change. Warning **remains**.

---

## 4. Upstream `better-sqlite3` — prebuildify migration status

### 4.1 Open issues (2026-06-27)

| Issue                                                           | Title                                               | Status                                                  | Relevance                 |
| --------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------- | ------------------------- |
| [#655](https://github.com/WiseLibs/better-sqlite3/issues/655)   | Replace prebuild+prebuild-install with prebuildify  | **Open** since 2021-07; 18 comments; maintainer engaged | Root migration tracker    |
| [#1463](https://github.com/WiseLibs/better-sqlite3/issues/1463) | NPM install warnings due to unmaintained dependency | **Open** 2026-03; confirms 12.8.0+ still warns          | Direct deprecation report |
| [#1481](https://github.com/WiseLibs/better-sqlite3/issues/1481) | npm RFC #868 will block install script by default   | **Open** 2026-06; 8 comments                            | Future functional risk    |

### 4.2 Maintainer position (issue #655)

- **JoshuaWise (2022):** Skeptical of shipping all prebuildify binaries in the tarball — ~44 prebuilds × ~1 MB each penalizes slow connections vs. single prebuild download.
- **prebuild-install README** officially recommends **prebuildify + node-gyp-build**; better-sqlite3 has not adopted it.
- **Recent activity (2026-05):** Downstream consumers (+1) linking deprecation warning (#1463) and Node 25 / Windows compile failures when prebuild missing — increases pressure but **no merged PR** as of this report.

### 4.3 Likely upstream outcomes

| Outcome                                                              | Clears deprecation?                   | Clears npm v12 script block?        |
| -------------------------------------------------------------------- | ------------------------------------- | ----------------------------------- |
| **prebuildify + node-gyp-build** (binaries in package)               | **Yes**                               | **Yes** (no install script needed)  |
| **`optionalDependencies` prebuild packages** (esbuild/sharp pattern) | **Yes**                               | **Yes**                             |
| **Keep install script, swap tool**                                   | Maybe (if `prebuild-install` removed) | **No** — still needs `allowScripts` |
| **Status quo**                                                       | **No**                                | **No** (blocked on npm v12 default) |

**Timeline:** None committed. Issue open ~5 years. Strapi should not block releases on upstream.

---

## 5. npm RFC #868 — install scripts impact

**RFC:** [npm/rfcs#868](https://github.com/npm/rfcs/pull/868) — **merged 2026-06-08**.

### 5.1 Policy summary

- Dependency **`preinstall` / `install` / `postinstall`** (and auto-detected `node-gyp`) become **opt-in** via `allowScripts` in `package.json` (or `.npmrc` / CLI).
- New commands: `npm approve-scripts`, `npm deny-scripts`.
- Aligns npm with pnpm 10+, Yarn Berry, Bun, Deno.

### 5.2 Phased rollout

| Phase                  | npm version                                                           | Behavior for unlisted packages                                    |
| ---------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Phase 1** (shipping) | ≥ **11.16.0** (bundled in Node 26.3.0+)                               | Scripts **still run**; advisory warning lists unapproved packages |
| **Phase 2**            | **npm v12** (major; PR [#9424](https://github.com/npm/cli/pull/9424)) | Scripts **blocked** unless in `allowScripts`                      |

For `better-sqlite3`, the affected script is:

```json
"install": "prebuild-install || node-gyp rebuild --release"
```

Without approval, Phase 2 → **native module missing → Strapi fails to start** on SQLite.

### 5.3 Strapi gap vs pnpm

create-strapi **already** allowlists native builds for pnpm:

```41:46:packages/cli/create-strapi-app/src/utils/pnpm-config.ts
export const getPnpmBuildPackageNames = (scope: Scope): string[] => {
  const packages = new Set<string>(PNPM_STRAPI_BUILD_PACKAGES);

  if (scope.database.client === 'sqlite') {
    packages.add(PNPM_SQLITE_BUILD_PACKAGE);
  }
```

**No equivalent** for npm `allowScripts` yet. Recommended scaffold (future PR):

```json
{
  "allowScripts": {
    "better-sqlite3@12.11.1": true
  }
}
```

(Pin to version per RFC best practice; regenerate on template bump.)

### 5.4 Interaction with deprecation warning

RFC #868 addresses **script execution policy**, not deprecated package metadata. Even with `allowScripts`, **`prebuild-install` deprecation warning persists** until better-sqlite3 drops that dependency.

---

## 6. Alternative SQLite drivers — would switching break users?

Strapi v5 standardized on **better-sqlite3** (v4 used `sqlite3`). Replacing the driver is a **major product/engineering decision**, not a deprecation fix.

| Driver                              | Knex support                             | Strapi fit                                     | Migration cost              | User impact if switched                       |
| ----------------------------------- | ---------------------------------------- | ---------------------------------------------- | --------------------------- | --------------------------------------------- |
| **better-sqlite3** (current)        | First-class (`client: 'better-sqlite3'`) | Sync API, performance, default scaffold        | —                           | —                                             |
| **sqlite3** / **node-sqlite3**      | Supported                                | Deprecated path; v5 codemod removed it         | Revert v5 migration         | **Breaking** — all v5 SQLite apps             |
| **sql.js** (WASM)                   | Limited / slow                           | No native compile; poor fit for production CMS | Rewrite dialect assumptions | **Breaking** — perf, file I/O, deploy         |
| **@libsql/client**                  | Not Knex-native                          | Different hosting model (Turso)                | New connector layer         | **Breaking** — config, deploy, optional cloud |
| **better-sqlite3-multiple-ciphers** | Fork                                     | Encryption variant                             | Niche                       | **Breaking** for default users                |

**Framework coupling beyond Knex:**

- `SqliteDialect` — pragmas, batch insert cap (500), schema inspector SQL
- Migrations reference `sqlite`, `sqlite3`, `better-sqlite3` client strings for compatibility
- `@strapi/database` tests and integration suite assume better-sqlite3 behavior

**Verdict:** Driver switch **does not meet** the no-breaking-changes criterion. Not recommended for deprecation remediation.

---

## 7. Ranked options

Sorted by **recommendation** (best first). **Clears warn** = removes `prebuild-install` deprecation warning.

| Rank  | Option                                                                                             | Effort      | Clears warn?                   | User impact                                                                 | Strapi action                                     |
| ----- | -------------------------------------------------------------------------------------------------- | ----------- | ------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------- |
| **1** | **Document-only** — note in contributor docs / changelog that warning is upstream, install OK      | Low         | No                             | **None** — sets expectations                                                | Add short doc section; link #655/#1463            |
| **2** | **Template bump** — `12.8.0` → `12.11.1` in `database.ts`, upgrade codemod, examples, tests        | Low         | No                             | **None** for existing apps; new apps get latest 12.x + Node 26 engines      | Safe PR; pair with re-run CLI scaffold tests      |
| **3** | **Scaffold npm `allowScripts`** for `better-sqlite3` when SQLite + npm PM                          | Medium      | No                             | **None today**; **prevents SQLite install failure** on npm v12 default-deny | Extend `package-json.ts` mirroring pnpm pattern   |
| **4** | **Track upstream** — watch #655, #1481; bump template when better-sqlite3 drops `prebuild-install` | Low ongoing | **Yes** (when upstream ships)  | **None** until upstream release; then template bump only                    | Subscribe / periodic npm check                    |
| **5** | **Upstream contribution** — help better-sqlite3 prebuildify or optionalDependencies migration      | High        | **Yes** (when merged upstream) | **None** if semver patch/minor                                              | Optional Strapi eng time; high ecosystem leverage |
| **6** | **Resolution / override** `@mmomtchev/prebuild-install` or yarn resolutions                        | Low         | Unreliable                     | Risky — unsupported combo                                                   | **Not recommended**                               |
| **7** | **Fork better-sqlite3**                                                                            | Very high   | Maybe                          | Maintenance burden; trust issues                                            | **Reject**                                        |
| **8** | **Replace SQLite driver**                                                                          | Very high   | N/A                            | **Breaking** — existing SQLite apps, perf, tooling                          | **Reject** for this initiative                    |

### Recommended PR sequence (no breaking changes)

1. **Docs PR** — explain warning + future npm `allowScripts` (Option 1).
2. **Deps PR** — bump `better-sqlite3@12.11.1` + codemod + examples (Option 2).
3. **Scaffold PR** (before npm v12 GA) — npm `allowScripts` for SQLite projects (Option 3).
4. **React** when better-sqlite3 publishes without `prebuild-install` — single template bump (Option 4).

---

## 8. Verification checklist (for implementation PRs)

- [ ] Fresh `npx create-strapi@latest` with default SQLite → app starts (`yarn develop` / `npm run develop`)
- [ ] Node **22**, **24**, **26** — native install succeeds (macOS + Linux CI; Windows if available)
- [ ] `npm ls prebuild-install` shows chain via `better-sqlite3` only
- [ ] pnpm scaffold: `pnpm-workspace.yaml` still contains `better-sqlite3: true`
- [ ] npm ≥ 11.16: document or scaffold `allowScripts` behavior
- [ ] `yarn test:cli` — create-strapi-app scaffold / package-json tests updated for new pin
- [ ] `@strapi/upgrade` codemod bumps existing projects below `12.11.1`

---

## 9. Decision

| Question                                      | Answer                                                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Can Strapi fix the deprecation warning alone? | **No** — requires upstream better-sqlite3 change                                                                |
| Is the warning user-facing harmful today?     | **No** — cosmetic; install works                                                                                |
| Should we bump `better-sqlite3` anyway?       | **Yes** — Node 26 engines + patches; separate from warning                                                      |
| Should we switch drivers?                     | **No** — breaking                                                                                               |
| Biggest future risk?                          | **npm v12** blocking install script without `allowScripts`                                                      |
| Best long-term fix?                           | **Upstream** prebuildify / optionalDependencies ([#655](https://github.com/WiseLibs/better-sqlite3/issues/655)) |

**Phase 9 outcome:** **Investigation complete** → proceed with Options **1 + 2 + 3** (docs, template bump, npm allowScripts scaffold); **track upstream** for actual warning removal.

---

## References

- [better-sqlite3#655 — prebuildify migration](https://github.com/WiseLibs/better-sqlite3/issues/655)
- [better-sqlite3#1463 — deprecation warning](https://github.com/WiseLibs/better-sqlite3/issues/1463)
- [better-sqlite3#1481 — npm RFC #868](https://github.com/WiseLibs/better-sqlite3/issues/1481)
- [npm RFC #868 — install scripts opt-in](https://github.com/npm/rfcs/pull/868)
- [npm CLI Phase 1 — PR #9360](https://github.com/npm/cli/pull/9360)
- [npm CLI Phase 2 (v12) — PR #9424](https://github.com/npm/cli/pull/9424)
- [prebuild-install deprecation note](https://www.npmjs.com/package/prebuild-install#note)
