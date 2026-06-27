# Agent 2 — Simple audit bumps (Phase 2)

**Branch:** `chore/deps-simple-audit-bumps`  
**Plan:** [`DEPENDENCY_REMEDIATION_PLAN.md`](../../DEPENDENCY_REMEDIATION_PLAN.md) Phase 2  
**Audit:** [`AUDIT_NPM_20260626.md`](../../AUDIT_NPM_20260626.md)

---

## Goal

Single draft PR with **version-pin updates only** — no API or architecture changes. Drops any bump that would require code fixes.

---

## Bumps included

| Package          | From    | To          | Location(s)                                                                              | Clears / notes           |
| ---------------- | ------- | ----------- | ---------------------------------------------------------------------------------------- | ------------------------ |
| `ws`             | 8.20.1  | **8.21.0**  | `@strapi/data-transfer`                                                                  | ws DoS (high)            |
| `jsonwebtoken`   | 9.0.0   | **9.0.2**   | `@strapi/admin`, `@strapi/core`, `@strapi/plugin-users-permissions`, `@strapi/cloud-cli` | lodash transitive        |
| `esbuild-loader` | 4.4.3   | **4.5.0**   | `@strapi/strapi`                                                                         | esbuild (webpack path)   |
| `formik`         | 2.4.5   | **2.4.9**   | admin, upload, content-releases, users-permissions, documentation                        | lodash transitive        |
| `slate-react`    | 0.98.3  | **0.98.4**  | `@strapi/content-manager`                                                                | lodash transitive        |
| `ai`             | 5.0.52  | **5.0.206** | `@strapi/content-type-builder`                                                           | provider-utils (partial) |
| `@ai-sdk/react`  | 2.0.120 | **2.0.208** | `@strapi/content-type-builder`                                                           | provider-utils (partial) |

**Excluded from this PR (separate phases):** design-system (Phase 1), nodemailer 9 (Phase 3), preferred-pm 5 (Phase 4), umzug replacement (Phase 5), OAuth stack (Phase 8), Vite 8 (#26541).

---

## Local verification

| Check                                        | Result                                                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `yarn install`                               | OK (peer warnings for `zod` vs `@ai-sdk/react` — pre-existing monorepo pin; no code change required) |
| `@strapi/data-transfer` test:unit            | 34 suites pass                                                                                       |
| `@strapi/content-manager` test:unit          | 35 suites pass                                                                                       |
| `@strapi/content-type-builder` test:unit     | 9 suites pass                                                                                        |
| `@strapi/plugin-users-permissions` test:unit | 5 suites pass                                                                                        |
| `@strapi/cloud-cli` test:unit                | 3 suites pass                                                                                        |
| `@strapi/admin` test:ts                      | pass                                                                                                 |

**User-facing impact:** none expected — patch/minor semver only.

**Known residual audit items:** `@ai-sdk/provider-utils` may still flag until Phase 13 (CTB AI coordinated upgrade).

---

## PR

- **Title:** `chore(deps): patch/minor dependency bumps (audit hygiene)`
- **Target:** `develop`
- **Draft:** yes — mark ready after CI green

---

## CI babysit notes

- Rebased from clean `origin/develop` (no merge conflict markers in root `package.json`).
- If CI fails on unrelated flakes, merge latest `develop` once before chasing test fixes.
