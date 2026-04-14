# Strapi Monorepo — Agent Guide

Strapi is an open-source headless CMS.
Yarn workspaces + Nx monorepo. Node ≥20 ≤24, Yarn 4.
Target branch: `develop` (not `main`). All PRs go to `develop`.
Per-package `AGENTS.md` files are planned for future iterations — none exist yet.

---

## Repository Structure

```
packages/core/       # Framework: strapi, admin, database, content-manager, types, utils…
packages/plugins/    # Official plugins: users-permissions, i18n, graphql, documentation…
packages/providers/  # Email + upload provider implementations
packages/utils/      # Shared tooling: logger, eslint-config, tsconfig, vitest-config
packages/cli/        # CLI tools: create-strapi-app, cloud-cli
examples/            # Dev sandboxes only — not published, not for production fixes
docs/                # Contributor documentation (also at contributor.strapi.io)
tests/               # Test infrastructure scripts
```

| Package                            | Description                                               |
| ---------------------------------- | --------------------------------------------------------- |
| `@strapi/strapi`                   | Main framework entry point (Koa server)                   |
| `@strapi/admin`                    | React 18 admin dashboard                                  |
| `@strapi/core`                     | Core business logic                                       |
| `@strapi/database`                 | Database abstraction (MySQL, PostgreSQL, MariaDB, SQLite) |
| `@strapi/content-manager`          | Content management UI                                     |
| `@strapi/types`                    | Shared TypeScript type definitions                        |
| `@strapi/permissions`              | RBAC engine                                               |
| `@strapi/plugin-users-permissions` | JWT authentication                                        |

---

## Architecture

- **`strapi` global** — The `Strapi` class is the DI container and central hub, accessible as `strapi` everywhere (e.g. `strapi.documents`, `strapi.db`, `strapi.log`). Lifecycle: Register → Bootstrap → Start → Destroy (start() calls load() internally, which runs register + bootstrap).
- **Server / Admin split** — Koa.js HTTP server (`@strapi/strapi`) + React/Redux admin (`@strapi/admin`). Packages with both concerns export dual entry points: `strapi-server` (Node.js logic) and `strapi-admin` (UI components). Changes to one rarely require changes to the other.
- **Document Service** — The primary high-level API for content (`strapi.documents`). Replaced the legacy Entity Service. Always use this for reading/writing content — never raw DB queries unless you're working inside `@strapi/database` itself.
- **Plugin system** — Plugins register routes, controllers, services, content types, and middleware via the same `strapi-server` / `strapi-admin` dual structure. Official plugins live in `packages/plugins/`; app-level plugins in `src/plugins/`.
- **Content Types** — Defined as JSON schemas. The database layer auto-generates tables from them. Never write raw migrations for content type changes.
- **Draft & Publish** — Core content workflow. Documents can exist in draft or published state; the Document Service handles the state machine.
- **EE / CE split** — Some features are Enterprise Edition only, gated at runtime. See EE toggles in Notes for Agents.
- **`@strapi/types`** — Single source of truth for shared TypeScript types. Import from here; improve these types rather than duplicating locally.

---

## Setup & Development

```bash
# Initial setup (run once after cloning)
yarn install
yarn setup                    # clean + build all packages

# Start databases (postgres/mysql)
docker-compose -f docker-compose.dev.yml up -d

# Run the dev sandbox
cd examples/getstarted
yarn develop                  # SQLite (default)
DB=postgres yarn develop      # PostgreSQL
DB=mysql yarn develop         # MySQL

# Watch all packages + run sandbox with admin watch (two terminals)
yarn watch                                           # terminal 1, repo root
cd examples/getstarted && yarn develop --watch-admin # terminal 2

# Build
yarn build              # all packages (code + types)
yarn build:code         # faster — skips .d.ts generation
yarn nx build @strapi/admin   # single package
```

---

## Testing

```bash
# Unit (fastest — run first)
yarn test:unit
yarn test:unit:watch

# Frontend (admin panel)
yarn test:front              # runs with IS_EE=true (EE features enabled)
yarn test:front:ce           # runs with IS_EE=false (Community Edition only)

# Type checking
yarn test:ts                 # all packages + front + back

# API integration (auto-generates a test app)
yarn test:api                # SQLite
yarn test:api --db=postgres
yarn test:api --db=mysql
yarn test:api -u             # update snapshots

# E2E (Playwright)
yarn playwright install      # one-time browser install
yarn test:e2e --setup --concurrency=1
```

**Before every PR:**

```bash
yarn test:unit && yarn test:front && yarn test:ts && yarn lint
```

E2E (`yarn test:e2e`) is required per CONTRIBUTING.md but slow — CI enforces it on every PR.

**Test file location:** `__tests__/` subdirectories within each package (not a root `tests/` folder).

**When to add tests:** Always for bug fixes (reproduce the bug first). For features, add tests when they cover meaningful behaviour — not just to hit coverage numbers.

---

## Quality Gates

### Commits

Must pass `commitlint` (enforced by Husky and CI). Format:

```
<type>(<optional-scope>): <description>
```

Valid types: `feat` `fix` `chore` `ci` `docs` `enhancement` `test` `revert` `security` `future`

```bash
feat(content-manager): add bulk delete action
fix(database): preserve relation order during publish
chore(admin): migrate data-fetching to react-query
```

Use `yarn commit` for an interactive prompt. Run `yarn version:check` if you've touched any `package.json`.

### CLA

First-time contributors must sign the [Contributor License Agreement](https://cla.strapi.io/strapi/strapi) before a PR can be merged. The CLA bot prompts automatically on the PR.

### TypeScript

- Import types from `@strapi/types` — extend or improve them rather than duplicating locally.
- Never use `any` when a proper type exists or can be reasonably defined.
- Run `yarn test:ts` before pushing.

### Linting & Formatting

```bash
yarn lint           # ESLint across all packages
yarn lint:fix       # auto-fix
yarn format         # Prettier (2-space indent, single quotes, semicolons, trailing commas, arrow parens, 100-char width, LF)
yarn prettier:check # check only
```

---

## PR Guidelines

- Branch from `develop`, target `develop` — never `main`.
- Link the issue you're fixing in the description.
- PR description must use this template:
  - **What does it do?** — technical changes made
  - **Why is it needed?** — problem being solved
  - **How to test it?** — steps to reproduce and verify
  - **Related issue(s)/PR(s)** — links

---

## Notes for Agents

- **`examples/`** apps are sandboxes only — use them to reproduce and test fixes, never commit production changes to them.
- **Test files** belong in `__tests__/` subdirectories, not a root `tests/` folder.
- **Workspace deps** — internal `packages/` deps reference each other with pinned semver versions (e.g. `"5.42.0"`), not `workspace:*`. The `workspace:*` protocol is only used in `examples/` apps and some root devDeps.
- **Entity Service is deprecated** — always use the Document Service (`strapi.documents`) for content operations.
- **Lifecycle phases** — `strapi.isLoaded` must be `true` before accessing services. Plugins and DB are not available until after the `load()` phase.
- **API test apps are ephemeral** — regenerate with `yarn test:generate-app` rather than reusing a stale one; stale apps cause misleading test failures.
- **EE toggles** — `IS_EE=true` for frontend tests, `RUN_EE=true` for E2E tests.
