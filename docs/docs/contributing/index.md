---
title: Contributing
description: How to contribute to the Strapi monorepo, with guides for testing, front-end and TypeScript conventions, and for writing these docs.
sidebar_label: Overview
sidebar_position: 0
---

This section is for people who change the Strapi monorepo. It answers how to do things. To understand how Strapi works, read [Architecture](../architecture/index.md) and the [package pages](../packages/index.mdx).

## Start here

- [Contributing to Strapi](./01-contributing-guide.mdx): the contribution process, from issue to pull request.
- [Code of conduct](./02-code-of-conduct.mdx): the rules for taking part in the community.

## Testing

- [Testing](./03-testing/index.md): the test types and the command that runs each one.
- [E2E setup](./03-testing/e2e/00-setup.md): install Playwright and run the end-to-end tests.
- [E2E app template](./03-testing/e2e/01-app-template.md): how the shared app template feeds the generated test apps.
- [E2E data transfer](./03-testing/e2e/02-data-transfer.md): import and export the data set that the tests rely on.

## Conventions

- [Frontend guidelines](./04-frontend-guidelines.md): how to write admin panel code.
- [TypeScript](./05-typescript.md): typing conventions.
- [Working with the design system](./06-design-system.md): using `@strapi/design-system` in the admin panel.

## These docs

- [Writing docs](./07-writing-docs.md): where content goes, frontmatter, page status, links and the local workflow.
- [Docs health](./08-docs-health.mdx): the pages flagged as stub, draft or needs-review.

## Proposing a change

Design proposals (RFCs) happen in the [RFCs category of GitHub Discussions](https://github.com/strapi/strapi/discussions/categories/rfcs), not in this repository.
