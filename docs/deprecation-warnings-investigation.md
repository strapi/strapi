# npm deprecation warnings (new app install)

One row per warning as shown by `npm install` (same order as the typical warning list).

| Warning                 | Cause                                                                       | Path forward                                                                                    |
| ----------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **inflight@1.0.6**      | Dependency of **glob@7** only.                                              | Removing **glob@7** from the tree removes **inflight** with it.                                 |
| **keygrip@1.1.0**       | **koa** → **cookies** → **keygrip**.                                        | Resolved when **cookies** (or **koa**) moves off deprecated **keygrip**.                        |
| **rimraf@3.0.2**        | **react-query@3** → **broadcast-channel**; **ESLint 8** → **flat-cache@3**. | **@tanstack/react-query** + ESLint/file-entry-cache upgrades.                                   |
| **mailcomposer@3.12.0** | **sendmail** npm package.                                                   | Replace sendmail provider with **nodemailer** (sendmail transport); drop **sendmail**.          |
| **@koa/router@12.0.2**  | Direct Strapi / Koa usage.                                                  | **v15+** is a **breaking change** for plugin authors and apps—plan a major + migration guide.   |
| **glob@7.2.3**          | Legacy toolchains (often alongside rimraf 3, old ESLint cache, etc.).       | Same work as **rimraf@3** / modernising those stacks; **should already be gone** once resolved. |
| **buildmail@3.10.0**    | **mailcomposer** → **buildmail** (under **sendmail**).                      | Same as **mailcomposer**: nodemailer-based provider, no **sendmail** package.                   |
| **boolean@3.2.0**       | Resolved                                                                    |
| **tar@6.2.1**           | Resolved                                                                    |

Internal triage notes, not end-user docs.
