# Strapi contributor docs

> [!NOTE]
> These are the docs for people who change the Strapi monorepo. For the official Strapi documentation, go to [docs.strapi.io](https://docs.strapi.io).

This folder holds the [Docusaurus](https://docusaurus.io) site published at [contributor.strapi.io](https://contributor.strapi.io). It is a standalone Yarn project. Run the commands below in `docs/`.

## Sections

The content is in `docs/docs/`. Readers pick a section by intent.

| Section       | Folder                    | Content                                                   |
| ------------- | ------------------------- | --------------------------------------------------------- |
| Contributing  | `docs/docs/contributing/` | How-to: testing, conventions, writing these docs.         |
| Architecture  | `docs/docs/architecture/` | How several packages work together.                       |
| Packages      | `docs/docs/packages/`     | One page per workspace package. Paths mirror `packages/`. |
| API reference | `docs/docs/api/`          | The `Strapi` class and its parts.                         |

## Commands

```bash
yarn install            # install dependencies
yarn start              # dev server with live reload
yarn build              # production build; fails on broken links and invalid frontmatter
yarn scaffold:packages  # create the missing package pages
yarn tsc --noEmit       # type-check the components and plugins
```

Redirects for moved pages only work in a production build. To test them, run `yarn build && yarn serve`.

## Writing docs

Read [Writing docs](docs/contributing/07-writing-docs.md) before you add or move a page. It is also published at [contributor.strapi.io/contributing/writing-docs](https://contributor.strapi.io/contributing/writing-docs). Agents read [AGENTS.md](AGENTS.md) in this folder.
