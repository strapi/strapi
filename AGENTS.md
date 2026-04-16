# Strapi Monorepo — Agent Guide

Strapi is an open-source headless CMS.
Yarn workspaces + Nx monorepo. Node ≥20 ≤24, Yarn 4.
Target branch: `develop` (not `main`). All PRs go to `develop`.

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
tests/               # Integration, E2E, and CLI test infrastructure
```

The following are the most important packages (not exhaustive — run `yarn workspaces list` for the full set):

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

- **`Strapi` class** — The DI container and central hub. Accessed as a `strapi` parameter injected through the factory pattern (e.g. `createService(strapi)`). Never use `global.strapi` — always prefer proper dependency injection. Provides `strapi.documents`, `strapi.db`, `strapi.log`, etc. Lifecycle: Register → Bootstrap → Start → Destroy (`start()` calls `load()` internally, which runs register + bootstrap).
- **Server / Admin split** — Koa.js HTTP server (`@strapi/strapi`) + React/Redux admin (`@strapi/admin`). Packages with both concerns export dual entry points: `strapi-server` (Node.js logic) and `strapi-admin` (UI components).
- **Document Service** — The primary high-level API for content (`strapi.documents`). Replaced the legacy Entity Service. Always use this for reading/writing content — never raw DB queries unless you're working inside `@strapi/database` itself.
- **Plugin system** — Plugins register routes, controllers, services, content types, and middleware via the same `strapi-server` / `strapi-admin` dual structure. Official plugins live in `packages/plugins/`.
- **Content Types** — Defined using a JSON-based notation (not JSON Schema spec). Each content type has a `schema.json` file — see any `packages/core/content-manager/server/src/content-types/` for examples. The database layer auto-generates tables from them. Never write raw migrations for content type changes.
- **EE / CE split** — Some features are Enterprise Edition only, gated at runtime. See EE toggles in the Testing section below.
- **`@strapi/types`** — Single source of truth for shared TypeScript types. Import from here; improve these types rather than duplicating locally.

---

## Monorepo Setup

```bash
# Initial setup (run once after cloning)
yarn install
yarn setup                    # clean + build all packages
```

---

## Development

```bash
# Run the dev sandbox
cd examples/getstarted
yarn develop                  # SQLite (default)

# Start non-memory databases (postgres/mysql)
docker-compose -f docker-compose.dev.yml up -d
DB=postgres yarn develop      # PostgreSQL
DB=mysql yarn develop         # MySQL

# Watch all packages + run sandbox with admin watch (two terminals)
yarn watch                                           # terminal 1, repo root
cd examples/getstarted && yarn develop --watch-admin # terminal 2
```

---

## Build

```bash
yarn build              # all packages (code + types)
yarn build:code         # faster — skips .d.ts generation
yarn nx build @strapi/admin   # single package
```

---

## Testing

### Unit tests (fastest — run first)

Unit test files live in `__tests__/` subdirectories within each package.

```bash
yarn test:unit
yarn test:unit:watch
yarn test:unit:update         # update snapshots
```

### Frontend tests (admin panel)

Frontend test files also live in `__tests__/` within their respective packages.

```bash
yarn test:front              # runs with IS_EE=true (EE features enabled)
yarn test:front:ce           # runs with IS_EE=false (Community Edition only)
yarn test:front:update       # update snapshots (EE)
yarn test:front:update:ce    # update snapshots (CE)
```

### Type checking

```bash
yarn test:ts                 # all packages + front + back
```

### API integration tests

Integration tests live in `tests/api/`. Test apps are generated automatically — always regenerate with `yarn test:generate-app` rather than reusing a stale one (stale apps cause misleading failures).

```bash
yarn test:api                # SQLite
yarn test:api --db=postgres
yarn test:api --db=mysql
yarn test:api -u             # update snapshots
```

### CLI tests

CLI tests live in `tests/cli/`.

```bash
yarn test:cli
yarn test:cli:debug          # with debug output
yarn test:cli:update         # update snapshots
```

### E2E tests (Playwright)

E2E tests live in `tests/e2e/tests/` organized by domain (e.g. `admin`, `content-manager`, `i18n`).

```bash
yarn playwright install                          # one-time browser install
yarn test:e2e --setup --concurrency=1            # run all domains sequentially
yarn test:e2e --domains content-manager admin    # run specific domains only
yarn test:e2e --concurrency=3                    # run 3 domains in parallel
```

### EE toggles

- `IS_EE=true` — enables Enterprise features in frontend tests (`yarn test:front`)
- `RUN_EE=true` — enables Enterprise features in E2E tests

### Pre-PR checklist

All tests must pass before merging. Run at minimum:

```bash
yarn test:unit && yarn test:front && yarn test:ts && yarn lint && yarn prettier:check
```

E2E (`yarn test:e2e`) is required per CONTRIBUTING.md but slow — CI enforces it on every PR.

**When to add or update tests:** Always for bug fixes (reproduce the bug first). For features, add tests when they cover meaningful behaviour — not just to hit coverage numbers. When changing existing behaviour, update the affected tests to match.

---

## Quality Gates

### Commits

Must follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) (enforced by Husky `commit-msg` hook and CI via `commitlint`). Format:

```
<type>(<optional-scope>): <description>
```

Valid types: `feat` `fix` `chore` `ci` `docs` `enhancement` `test` `revert` `security` `future` `release`

**Examples:**

```bash
feat(content-manager): add bulk delete action
fix(database): preserve relation order during publish
chore(admin): migrate data-fetching to react-query
```

Use `yarn commit` for an interactive prompt. Run `yarn version:check` if you've touched any `package.json`.

### TypeScript

- Import types from `@strapi/types` — extend or improve them rather than duplicating locally.
- Never use `any` when a proper type exists or can be reasonably defined. Prefer `unknown` otherwise.
- Run `yarn test:ts` before pushing.

### Linting & Formatting

```bash
yarn lint           # ESLint across all packages
yarn lint:fix       # auto-fix
yarn format         # Prettier (2-space indent, single quotes, semicolons, trailing commas, arrow parens, 100-char width, LF)
yarn prettier:check # check only
```

---

## Security

- Never commit secrets, credentials, or API keys.
- Never disable or weaken authentication/authorization checks.
- Use parameterized queries — never interpolate user input into raw SQL or database queries.
- Validate and sanitize all user input at controller/service boundaries.
- When working with EE-gated features, do not bypass license checks.

---

## PR Guidelines

- Branch from `develop`, target `develop` — never `main`.
- Link the issue you're fixing in the description.
- All tests must pass before merging.
- PR description must use this template:
  - **What does it do?** — technical changes made
  - **Why is it needed?** — problem being solved
  - **How to test it?** — steps to reproduce and verify
  - **Related issue(s)/PR(s)** — links

---

## Notes for Agents

- **`examples/`** apps are sandboxes only — use them to reproduce and test fixes, never commit changes to them unless specifically asked to do so.
- **Workspace deps** — internal `packages/` deps reference each other with pinned semver versions (e.g. `"5.42.0"`), not `workspace:*`. The `workspace:*` protocol is only used in `examples/` apps and some root devDeps.
- **Entity Service is deprecated** — always use the Document Service (`strapi.documents`) for content operations.
- **Lifecycle phases** — `strapi.isLoaded` must be `true` before accessing services. Plugins and DB are not available until after the `load()` phase.
