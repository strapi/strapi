# Dependency remediation — agent progress

Master index for parallel investigation/implementation work. Plan: [`DEPENDENCY_REMEDIATION_PLAN.md`](../../DEPENDENCY_REMEDIATION_PLAN.md). Audit: [`AUDIT_NPM_20260626.md`](../../AUDIT_NPM_20260626.md).

| Agent | Task                                                | Status                                                     | Report                                             |
| ----- | --------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------- |
| 1     | Vite 8 PR refresh (#26541)                          | in progress                                                | [01-vite-pr.md](./01-vite-pr.md)                   |
| 2     | Simple bumps draft PR + CI                          | in progress                                                | [02-simple-bumps-pr.md](./02-simple-bumps-pr.md)   |
| 3     | `@koa/router` removal deep dive                     | in progress                                                | [03-koa-router.md](./03-koa-router.md)             |
| 4     | `prebuild-install` solutions                        | **done**                                                   | [04-prebuild-install.md](./04-prebuild-install.md) |
| 5     | Replace `umzug` safely                              | in progress                                                | [05-umzug.md](./05-umzug.md)                       |
| 6     | `nodemailer` 8→9 + draft PR?                        | **done** — [PR](https://github.com/strapi/strapi/pull/TBD) | [06-nodemailer.md](./06-nodemailer.md)             |
| 7     | `preferred-pm` 3→5                                  | in progress                                                | [07-preferred-pm.md](./07-preferred-pm.md)         |
| 8     | OAuth stack removal (`grant`/`purest`/`jwk-to-pem`) | draft PR                                                   | [08-oauth-stack.md](./08-oauth-stack.md)           |

**Breaking change lens:** user-facing only (REST/GraphQL, editor behavior, auth, documented plugin APIs). Internal refactors OK.

**Git rules:** Ben's branches push to `origin` on `strapi/strapi`. Draft PRs target `develop`. Do not commit audit/plan markdown unless part of agent deliverable.
