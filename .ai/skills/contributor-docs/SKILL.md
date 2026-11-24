---
name: contributor-docs
description: Use when writing, updating, or reviewing Strapi contributor docs in `docs/`; when documenting a package or an internal mechanism; when changing code that a contributor doc describes; or when flagging stale docs. Trigger on any edit under `docs/docs/`, on a request to explain how a package or mechanism works, and on a code change in a package that has a page in `docs/docs/packages/`.
---

# Strapi contributor docs

Source of truth: [Writing docs](../../../docs/docs/contributing/07-writing-docs.md) and [docs/AGENTS.md](../../../docs/AGENTS.md). The guide holds the conventions. This skill is the procedure. Do not copy the guide here or into a page.

`docs/` explains what Strapi internals are and why they work that way. Skills tell agents how to do tasks. A skill links to `docs/` and never copies from it.

## Procedure

### 1. Locate the page

- A package: `docs/docs/packages/<repo path>/`. The docs of `packages/core/database` are in `docs/docs/packages/core/database/index.md`.
- A topic that crosses packages: `docs/docs/architecture/`.
- Find a symbol or term: `rg -n '<symbol>' docs/docs`.
- No page exists: create one. For a package, run `yarn scaffold:packages` in `docs/`.

### 2. Read the status and the notes

Read the frontmatter `status` and `review_notes` first. The notes name the claims to check. A page with no `status` is trusted, so a wrong claim on it is a bug.

### 3. Verify against the code

Read the code that the page describes before you write or change a claim. Check names, paths, flows, commands and examples. Trust the code over prose, including the prose of the page. If you cannot verify a claim, do not state it as fact. Flag it in step 5.

### 4. Write or edit

Follow the [guide](../../../docs/docs/contributing/07-writing-docs.md): Markdown or MDX, frontmatter, package pages, links, diagrams, images, tags and style. Point to the code instead of restating it.

### 5. Set the status honestly

- New or edited content that you did not fully verify: `status: draft` and a `review_notes` item.
- Stale claims that you cannot fix now: `status: needs-review` and a note that names each claim.
- You changed code that a page describes and cannot update the page: `status: needs-review` and a note that says what changed.
- Remove `status` and `review_notes` only after you verified the whole page against the code. Say what you verified in the pull request description.
- Never remove a status to hide the banner.

### 6. Add redirects when you move a page

Add an entry to `docs/redirects.ts`, fix the relative links, and fix the references outside `docs/`: `rg 'docs/docs/' --glob '!docs/**'`.

### 7. Run the build

```bash
cd docs
yarn build            # fails on broken links, unknown status, package or tag
yarn tsc --noEmit
```

Then, at the repo root: `yarn prettier --write <changed paths>`.

## Checklist

- [ ] The page is in the right section. A package page mirrors the repo path.
- [ ] Every claim was checked against the code.
- [ ] Frontmatter has `title` and `description`. `status` is one of `stub`, `draft`, `needs-review`, or absent. Tags come from `docs/docs/tags.yml`.
- [ ] Pages link with relative file links. Code links use GitHub `blob/develop` without line anchors.
- [ ] `status` and `review_notes` describe the real state of the page.
- [ ] A redirect exists for each moved or deleted page.
- [ ] `yarn build` and `yarn tsc --noEmit` pass in `docs/`. Prettier was run.
