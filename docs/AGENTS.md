# Contributor docs (`docs/`)

Docusaurus site for contributor.strapi.io. It is a standalone Yarn project: run every command below in `docs/`, not at the repo root. Content is in `docs/docs/`.

The source of truth for conventions is [`docs/docs/contributing/07-writing-docs.md`](docs/contributing/07-writing-docs.md). Read it before you write or move a page. Use the [`contributor-docs` skill](../.ai/skills/contributor-docs/SKILL.md) for the procedure.

## Layout

```
docs/docs/contributing/   # how-to: testing, conventions, writing docs
docs/docs/architecture/   # explanations that cross packages
docs/docs/packages/       # one folder per package, mirrors packages/<group>/<name>
docs/docs/api/            # the Strapi class and its parts
docs/docs/tags.yml        # tag vocabulary
docs/plugins/             # build plugin: workspace graph, page status, package validation
docs/src/components/      # React components used by .mdx pages
docs/redirects.ts         # client redirects for moved pages
docs/static/img/<area>/   # images
```

## Rules

1. Write `.md` (CommonMark). Use `.mdx` only when the page imports a component. Never keep knowledge only inside a component.
2. Every new page has `title` and `description`. Allowed `status` values: `stub`, `draft`, `needs-review`. No `status` means trusted. The build throws on an unknown `status`, a bad `review_notes`, an unknown `package`, or an unknown tag.
3. Package docs mirror repo paths: `packages/core/database` is `docs/docs/packages/core/database/index.md`. Run `yarn scaffold:packages` to create missing package pages.
4. Link pages with relative file links (`../architecture/index.md`). Link code with `https://github.com/strapi/strapi/blob/develop/<path>`, without line anchors.
5. When you move or delete a page, add an entry to `docs/redirects.ts` and fix the links that point to it.
6. Use only tags that exist in `docs/docs/tags.yml`.
7. Verify every claim against the code before you remove a `status`. If you cannot verify a claim, keep the status and add a `review_notes` item.
8. Do not add em dashes, filler or promotional words. Write short sentences in the active voice.

## Verify

```bash
cd docs
yarn build            # strict: fails on broken links and invalid frontmatter
yarn tsc --noEmit     # components and plugins
```

Then, at the repo root: `yarn prettier --write <changed paths>`.

Redirects only work in a production build (`yarn build && yarn serve`).
