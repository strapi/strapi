# Strapi Fork — full-control backend for the News App

This is a **fork of the whole Strapi monorepo** (`strapi/strapi`, cloned at tag
`v5.50.1`, working branch `news-app-fork`). You own every package — core, admin,
database, GraphQL, plugins — and can modify any of them.

The News CMS runs as a workspace app at **`examples/news-cms/`**, which consumes
the local forked packages via the `workspace:*` protocol. Editing a package under
`packages/` and rebuilding it changes the backend the app runs on — no npm
publish, no external dependency.

```
strapi-fork/
├── packages/core/       strapi, admin, database, content-manager, core, types, utils
├── packages/plugins/    users-permissions, graphql, i18n, documentation, sentry, cloud, …
├── packages/providers/  email + upload providers
├── examples/news-cms/   ← YOUR CMS APP (content types, bootstrap, config)
└── FORK.md              this file
```

Proof it runs on the fork, not npm:

```bash
cd examples/news-cms
node -e "console.log(require.resolve('@strapi/strapi/package.json'))"
# → /…/strapi-fork/packages/core/strapi/package.json
```

## Prerequisites

- Node.js 20–26 (verified on 24)
- Corepack (bundled with Node) → provides Yarn 4.12: `corepack prepare yarn@4.12.0 --activate`

## First-time setup (already done in this repo)

```bash
yarn install          # link all workspaces
yarn build            # nx builds all packages (code + types)
```

Re-run `yarn build` after pulling upstream changes or if `dist/` is cleaned.

## Run the CMS

```bash
cd examples/news-cms
cp -n .env.example .env   # first clone only; .env is gitignored (holds secrets)
yarn develop             # http://localhost:1337/admin  ·  API on :1337
```

On first boot it seeds demo content and opens public read permissions (see
`examples/news-cms/src/index.ts`). REST is at `/api/*`, **GraphQL at `/graphql`**
(the `@strapi/plugin-graphql` workspace package is installed).

## The modify → rebuild → observe loop

You change backend behavior at two levels:

### 1. App-level (no core edit needed)

Most REST/GraphQL/behavior changes live in `examples/news-cms/src` — content
types, controllers, services, middlewares, policies, `register`/`bootstrap`
(`src/index.ts`). `yarn develop` hot-reloads these. Reach for core edits only
when the extension points genuinely can't do it.

### 2. Core / plugin / admin edit (the reason you forked)

| To change…               | Edit package                                   |
| ------------------------ | ---------------------------------------------- |
| Query engine / DB layer  | `packages/core/database`                       |
| Document service, server | `packages/core/core`, `packages/core/strapi`   |
| REST content-API         | `packages/core/strapi` (content-api)           |
| GraphQL schema/resolvers | `packages/plugins/graphql`                     |
| Admin panel UI           | `packages/core/admin`, `packages/core/content-manager` |
| Auth / permissions       | `packages/plugins/users-permissions`, `packages/core/permissions` |

Apply an edit, then rebuild the changed package and restart the app:

```bash
# rebuild one package (fast)
yarn nx build <project>          # e.g. yarn nx build @strapi/database
# or rebuild everything (code only, skips .d.ts — faster than full build)
yarn build:code
```

**Live workflow (auto-rebuild) — two terminals:**

```bash
# terminal 1 (repo root): watch + rebuild every package on change
yarn watch
# terminal 2: run the app, watching the admin too
cd examples/news-cms && yarn develop --watch-admin
```

After changing a **core server** package you generally restart `yarn develop`;
**admin** changes hot-reload with `--watch-admin`.

## After changing core — test

The monorepo ships full test suites (see `AGENTS.md`):

```bash
yarn test:unit          # fastest, run first
yarn test:ts            # type check
yarn lint && yarn prettier:check
# targeted: yarn nx test:unit @strapi/database
```

Always reproduce a bug with a test before fixing core behavior.

## Sync with upstream Strapi

This is the ongoing cost of a hard fork: you merge upstream security/feature
releases yourself.

```bash
# one-time: full history (we cloned shallow) + upstream remote
git fetch --unshallow
git remote add upstream https://github.com/strapi/strapi.git
git fetch upstream

# then, per update:
git checkout news-app-fork
git merge upstream/v5.51.0        # or a newer tag / upstream/develop
# resolve conflicts (heaviest in packages you modified)
yarn install && yarn build
cd examples/news-cms && yarn develop     # smoke test
```

Keep your modifications small and well-isolated to keep merges cheap.

## Push to your own GitHub fork

```bash
# create a fork on github.com (Fork button on strapi/strapi), then:
git remote rename origin upstream          # optional: keep upstream as 'upstream'
git remote add origin git@github.com:<you>/strapi.git
git push -u origin news-app-fork
```

Commits must follow Conventional Commits (Husky/commitlint enforce it) — e.g.
`feat(graphql): add custom articles resolver`.

## Notes

- Cloned shallow (`--depth 1`) — run `git fetch --unshallow` before your first
  upstream merge.
- `examples/` are the monorepo's sandbox apps; `news-cms` is yours to commit to.
- The News App web + mobile readers (`../news-app`) are unchanged — they still
  call `http://localhost:1337`, now served by this fork.
