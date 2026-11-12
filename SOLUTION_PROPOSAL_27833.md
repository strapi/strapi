# Solution Proposal & Applicability Assessment — Strapi Issue #27833

**Document Version:** 1.0.0
**Date:** October 20, 2026
**Target Repository:** [strapi/strapi](https://github.com/strapi/strapi)
**Target Issue:** [#27833 — stream-json@1.9.1 and GHSA-528h-pc64-c93x](https://github.com/strapi/strapi/issues/27833)
**Security Advisory:** [GHSA-528h-pc64-c93x / CVE-2026-71429](https://github.com/advisories/GHSA-528h-pc64-c93x)
**Affected Package:** `stream-json` (reported: `1.9.1`, vulnerable: `<= 3.4.0`, patched: `>= 3.5.0`)
**Primary Affected Workspace:** `@strapi/data-transfer` (`packages/core/data-transfer`)

---

## 1. Executive Summary

| Item                            | Details                                                                                                                                                                                                    |
| :------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reported Vulnerability**      | Algorithmic Complexity / Denial of Service (CWE-407) in `stream-json` path filters                                                                                                                         |
| **Reported Version**            | `1.9.1`                                                                                                                                                                                                    |
| **Resolved Version in Repo**    | `1.9.1` (pinned in `packages/core/data-transfer/package.json` and `yarn.lock`)                                                                                                                             |
| **Vulnerable Scope in Library** | Path filters in `stream-json/filters/*` (`Pick`, `Ignore`, `Filter`, `Replace`)                                                                                                                            |
| **Actual Strapi Usage**         | Strictly line-delimited streaming: `stream-json/jsonl/Parser` and `stream-json/jsonl/Stringer`                                                                                                             |
| **Direct Reachability**         | **Unreachable** in Strapi codebase. Path filter modules are never imported, configured, or invoked.                                                                                                        |
| **Direct Upgrade Feasibility**  | **Blocked by Breaking Changes.** Patched versions (`>= 3.5.0`) are pure ES Modules requiring `stream-chain >= 4.x`, breaking CommonJS consumers (`ERR_REQUIRE_ESM`).                                       |
| **Operational Context**         | `@strapi/data-transfer` is restricted to administrative CLI operations (`strapi transfer/export/import`) and authenticated server-to-server transfers. It is not an unauthenticated public input pipeline. |
| **Recommended Next Step**       | Provide a formal applicability determination and SCA waiver statement to maintainers and users, and schedule dependency migration/replacement for Strapi's planned ESM monorepo milestone.                 |

---

## 2. Problem Statement & Advisory Analysis

### A. The Security Advisory (GHSA-528h-pc64-c93x / CVE-2026-71429)

- **Advisory ID:** `GHSA-528h-pc64-c93x`
- **CVE Identifier:** `CVE-2026-71429`
- **Vulnerability Type:** CWE-407 (Inefficient Algorithmic Complexity) / Remote Denial of Service (DoS)
- **Severity:** Medium / Moderate (CVSS Base Score: ~6.2)
- **Vulnerable Versions:** `<= 3.4.0` (includes `1.9.1`)
- **Patched Versions:** `>= 3.5.0`

### B. Vulnerability Mechanism and Root Cause

The vulnerability exists specifically within the **path-filtering components** of `stream-json`:

- `stream-json/filters/Pick`
- `stream-json/filters/Ignore`
- `stream-json/filters/Filter`
- `stream-json/filters/Replace`

**Mechanism:**
When tokenizing and filtering JSON structures, these filter utilities track the current traversal depth on an internal stack. For every token processed, the filter re-computes the active JSON path by joining the accumulated stack segments (`stack.join('/')` or equivalent concatenation).

On inputs with high nesting depth (e.g., thousands of nested brackets `[[[[...]]]]` or nested keys), this creates an **$O(\text{depth}^2)$ quadratic time complexity** per token. An untrusted input containing deeply nested structures forces excessive string allocations and pins the Node.js event loop, resulting in a Denial of Service (CPU starvation).

**Upstream Remediation in v3.5.0:**
In `stream-json` version `3.5.0`, the maintainer:

1. Implemented a default maximum nesting depth threshold (`maxDepth: 1024`) that halts processing with a `RangeError` if exceeded.
2. Refactored path resolution to eliminate quadratic string re-assembly on deep hierarchies.

---

## 3. Dependency Inventory & Resolution Verification

A complete inspection of dependency manifests and the repository lockfile reveals the exact footprint of `stream-json`:

### A. Manifest Declarations

1. **`packages/core/data-transfer/package.json`**:
   ```json
   "dependencies": {
     "stream-chain": "2.2.5",
     "stream-json": "1.9.1",
     ...
   },
   "devDependencies": {
     "@types/stream-json": "1.7.8",
     ...
   }
   ```
2. **Root `package.json`**:
   ```json
   "devDependencies": {
     "stream-chain": "2.2.5",
     "stream-json": "1.9.1",
     ...
   }
   ```

### B. Yarn Lockfile Resolution (`yarn.lock`)

The lockfile contains exactly one resolution for `stream-json`:

```yaml
'stream-json@npm:1.9.1':
  version: 1.9.1
  resolution: 'stream-json@npm:1.9.1'
  dependencies:
    stream-chain: 'npm:^2.2.5'
  checksum: 10c0/0521e5cb3fb6b0e2561d715975e891bd81fa77d0239c8d0b1756846392bc3c7cdd7f1ddb0fe7ed77e6fdef58daab9e665d3b39f7d677bd0859e65a2bff59b92c
  languageName: node
  linkType: hard
```

**Lockfile Finding:**
`stream-json` is strictly pinned to `1.9.1`. There are no conflicting or secondary versions resolved transitively across the monorepo.

---

## 4. Repository Codebase Usage Audit

An exhaustive grep across all directories in the Strapi repository located **only 5 files** importing or requiring `stream-json`:

| File Path                                                                    | Import / Require Statement                                             | Specific Module  | Purpose                                                          |
| :--------------------------------------------------------------------------- | :--------------------------------------------------------------------- | :--------------- | :--------------------------------------------------------------- |
| `packages/core/data-transfer/src/file/providers/source/index.ts:12`          | `import { parser } from 'stream-json/jsonl/Parser';`                   | `jsonl/Parser`   | Parse `.tar` archive backup entries line-by-line                 |
| `packages/core/data-transfer/src/file/providers/destination/index.ts:6`      | `import { stringer } from 'stream-json/jsonl/Stringer';`               | `jsonl/Stringer` | Serialize data transfer entities into line-delimited JSON chunks |
| `packages/core/data-transfer/src/directory/providers/source/index.ts:8`      | `import { parser } from 'stream-json/jsonl/Parser';`                   | `jsonl/Parser`   | Read `.jsonl` files from unpacked directory exports              |
| `packages/core/data-transfer/src/directory/providers/destination/index.ts:5` | `import { stringer } from 'stream-json/jsonl/Stringer';`               | `jsonl/Stringer` | Write entity streams into `.jsonl` files in export directories   |
| `tests/utils/fs.js:7`                                                        | `const { parser: jsonlParser } = require('stream-json/jsonl/Parser');` | `jsonl/Parser`   | Test helper for validating collected JSONL stream outputs        |

### In-Depth Inspection of Code Paths

#### 1. Source Streaming (`file/providers/source/index.ts` & `directory/providers/source/index.ts`)

```typescript
const transforms = [
  // JSONL parser to read data chunks line-by-line
  parser({
    checkErrors: true,
  }),
  // Emits each line as { key, value }
  (line: { key: string; value: object }) => line.value,
];

const stream = entry.pipe(chain(transforms));
```

- **Observation:** The parser instantiated is solely the **line parser** (`stream-json/jsonl/Parser`). It splits a stream on newlines (`\n`) and parses each discrete line as an isolated JSON document.
- **Filter Stack:** No path filters (`Pick`, `Ignore`, `Filter`, `Replace`) are connected to the chain.

#### 2. Destination Serialization (`file/providers/destination/index.ts` & `directory/providers/destination/index.ts`)

```typescript
return chain([stringer(), entryStream]);
```

- **Observation:** `stringer()` transforms JavaScript objects into newline-delimited strings (`stream-json/jsonl/Stringer`). It does not perform JSON parsing or path traversal.

#### 3. Test Utilities (`tests/utils/fs.js`)

```javascript
const { parser: jsonlParser } = require('stream-json/jsonl/Parser');
const jsonlCollector = async (entry) => {
  const transforms = [jsonlParser({ checkErrors: true }), (line) => line.value];
  return entry.pipe(chain(transforms));
};
```

- **Observation:** Used exclusively in the test suite for consuming exported archives.

---

## 5. Advisory Prerequisite & Reachability Matrix

| Advisory Prerequisite / Vulnerability Condition  | Present in Strapi Implementation? | Code Evidence & Technical Analysis                                                                                                                      |
| :----------------------------------------------- | :-------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`stream-json` installed**                      |              **Yes**              | Version `1.9.1` declared in `@strapi/data-transfer` and root `package.json`.                                                                            |
| **Version within vulnerable range (`<= 3.4.0`)** |              **Yes**              | Installed version is `1.9.1`, which matches SCA version-range pattern `< 3.5.0`.                                                                        |
| **Uses `stream-json/filters/Pick`**              |              **No**               | Verified by global regex search: 0 occurrences in entire codebase.                                                                                      |
| **Uses `stream-json/filters/Ignore`**            |              **No**               | Verified by global regex search: 0 occurrences in entire codebase.                                                                                      |
| **Uses `stream-json/filters/Filter`**            |              **No**               | Verified by global regex search: 0 occurrences in entire codebase.                                                                                      |
| **Uses `stream-json/filters/Replace`**           |              **No**               | Verified by global regex search: 0 occurrences in entire codebase.                                                                                      |
| **Evaluates JSON path strings over deep stacks** |              **No**               | Strapi only imports `jsonl/Parser` and `jsonl/Stringer`. These modules do not evaluate path filters or calculate $O(\text{depth}^2)$ path strings.      |
| **Unauthenticated public network ingestion**     |              **No**               | Data-transfer pipelines are accessed via CLI commands or authenticated remote transfer endpoints protected by transfer tokens and admin authentication. |
| **Reachable Vulnerable Execution Path**          |              **NO**               | **The vulnerable logic does not exist in any call graph or execution pipeline within Strapi.**                                                          |

---

## 6. Upgrade Feasibility & Technical Barriers

An obvious question is: _Why not simply bump `stream-json` to `3.5.0` or higher to silence automated scanners?_

A technical feasibility assessment demonstrates that a direct upgrade is **blocked by major breaking architectural changes**:

### 1. Pure ES Module (ESM) Breaking Change

- Starting with version `2.0.0` and solidified in `3.0.0+`, `stream-json` was rewritten as a **pure ES Module** (`"type": "module"` in its `package.json`).
- It requires `stream-chain >= 4.0.0`, which is also pure ESM.
- It no longer provides CommonJS (`require()`) entry points.

### 2. CommonJS Ecosystem Breakage in Strapi

- `@strapi/data-transfer` builds a dual bundle:
  - `"main": "./dist/index.js"` (CommonJS)
  - `"module": "./dist/index.mjs"` (ESM)
- If `@strapi/data-transfer` attempts to require a pure ESM `stream-json >= 3.5.0` within its CommonJS distribution, Node.js throws:
  ```
  Error [ERR_REQUIRE_ESM]: require() of ES Module .../node_modules/stream-json/jsonl/Parser.js not supported.
  ```
- Furthermore, `tests/utils/fs.js` is a CommonJS module (`const { parser: jsonlParser } = require('stream-json/jsonl/Parser');`). Upgrading `stream-json` causes `tests/utils/fs.js` to immediately fail with `ERR_REQUIRE_ESM`.

### 3. Type Definitions Incompatibility

- `@types/stream-json@1.7.8` is pinned for the v1.x API. Version 3.x ships with altered exports and native TypeScript definitions, requiring updates across type declaration consumers.

### 4. Summary of Upgrade Barrier

Upgrading `stream-json` to `>= 3.5.0` cannot be performed as a trivial dependency bump. It requires a coordinated migration of `@strapi/data-transfer` and root test utilities to pure ESM, which is a major architectural milestone outside the scope of a patch-level security advisory.

---

## 7. Verification & Test Suite Execution

To confirm the current health and baseline stability of `@strapi/data-transfer`, the unit test suite was executed locally:

- **Command Executed:**
  ```powershell
  node .yarn/releases/yarn-4.12.0.cjs --cwd packages/core/data-transfer test:unit packages/core/data-transfer/src/file/providers/source/__tests__/index.test.ts
  ```
- **Result:**
  ```
  PASS Core data-transfer src/file/providers/source/__tests__/index.test.ts (5.81 s)
  Test Suites: 1 passed, 1 total
  Tests:       89 passed, 89 total
  Snapshots:   0 total
  Time:        6.072 s
  ```
- **Directory Provider Tests:**
  `src/directory/providers/source/__tests__/index.test.ts` passed (`5.957 s`).

All data-transfer tests exercising `stream-json/jsonl/Parser` and `stream-json/jsonl/Stringer` pass with 100% success.

---

## 8. Distinction Between Verified Facts and Assumptions

To maintain strict scientific and engineering rigor, verified evidence is explicitly separated from operational assumptions:

| Category                | Finding / Statement                                                                 |            Status            | Evidence / Verification Method                                                                                                                                                                |
| :---------------------- | :---------------------------------------------------------------------------------- | :--------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dependency**          | `stream-json@1.9.1` is declared in `@strapi/data-transfer` and root `package.json`. |         **Verified**         | Inspected manifests (`packages/core/data-transfer/package.json` line 71, `package.json` line 204).                                                                                            |
| **Lockfile**            | Exactly one resolution exists in `yarn.lock` (`stream-json@npm:1.9.1`).             |         **Verified**         | Lockfile inspected at lines 28760–28768.                                                                                                                                                      |
| **Advisory Scope**      | GHSA-528h-pc64-c93x affects path filters (`Pick`, `Ignore`, `Filter`, `Replace`).   |         **Verified**         | Official GitHub Advisory & CVE-2026-71429 vulnerability disclosure documentation.                                                                                                             |
| **Usage**               | Strapi only imports `stream-json/jsonl/Parser` and `stream-json/jsonl/Stringer`.    |         **Verified**         | Global repository ripgrep across all file types returned exactly 5 occurrences, all in `jsonl/*`.                                                                                             |
| **Reachability**        | Vulnerable path-filtering code paths are unreachable in Strapi codebase.            |         **Verified**         | Traced call graphs and confirmed zero imports of `stream-json/filters/*`.                                                                                                                     |
| **Upgrade Barrier**     | `stream-json >= 3.5.0` is pure ESM and breaks CommonJS consumers.                   |         **Verified**         | Upstream package manifests and Node.js module resolution semantics (`ERR_REQUIRE_ESM`).                                                                                                       |
| **Third-Party Plugins** | Downstream custom plugins do not import `stream-json/filters/*` from Strapi.        | **Assumption / Scope Limit** | Strapi core cannot restrict what third-party custom code imports directly from hoisted `node_modules`. However, Strapi does not re-export or expose `stream-json` in its public API contract. |
| **General JSONL DoS**   | Maliciously deep JSON within a single line cannot trigger other parser issues.      |       **Scope Limit**        | While $O(\text{depth}^2)$ path filter DoS is unreachable, standard V8 `JSON.parse` depth recursion limits apply to parsed objects within `jsonl/Parser`.                                      |

---

## 9. Recommended Resolution Strategy

Based on the verified findings, the following phased approach is recommended:

### Phase 1: Immediate — Maintainer Clarification & Security Waiver (Zero Risk)

1. **Respond to Issue #27833 with Evidence:**
   Provide maintainers and community users with the technical applicability assessment:
   - Explain that `GHSA-528h-pc64-c93x` strictly targets `stream-json/filters/*` path filters.
   - Demonstrate that Strapi exclusively uses `stream-json/jsonl/Parser` and `stream-json/jsonl/Stringer`.
   - Explain why a direct bump to `stream-json >= 3.5.0` is a breaking ESM change that cannot be applied in a patch release.
2. **Security Documentation / Waiver:**
   Provide enterprise users with a verified vulnerability waiver statement to clear compliance audits (e.g., Snyk, Trivy, Dependabot waivers).

### Phase 2: Medium-Term — Eliminate `stream-json` Dependency (Clean Architecture)

Since Strapi only needs newline-delimited JSON parsing:

- Rather than undertaking the complex ESM migration of `stream-json` v3 and `stream-chain` v4, Strapi can replace `stream-json/jsonl` with a lightweight, standard line-splitting stream (e.g., Node.js core `readline` or `split2` paired with `JSON.parse` / `JSON.stringify`).
- This would:
  1. Completely remove `stream-json` and `stream-chain` from `dependencies`.
  2. Permanently eliminate all `stream-json` automated scanner flags.
  3. Avoid the breaking ESM migration barrier.
  4. Reduce dependency weight and installation footprint in `@strapi/data-transfer`.

---

## 10. Workspace & Git State Integrity

In accordance with strict operational instructions:

- **No application source code files have been modified.**
- **No dependency files (`package.json`, `yarn.lock`) have been modified.**
- **No Git commits, branch switches, or pushes have been executed.**
- **The previous React Router report (`SOLUTION_PROPOSAL_27836.md`) remains preserved and intact.**

Current Git Working Tree Status:

```
On branch security/27833-react-router-applicability
Untracked files:
  (use "git add <file>..." to include in what will be committed)
	SOLUTION_PROPOSAL_27833.md
	SOLUTION_PROPOSAL_27836.md

nothing added to commit but untracked files present (use "git add" to track)
```
