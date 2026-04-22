---
sidebar_position: 1
sidebar_label: Introduction
title: End-to-end tests
---

# End-to-end tests

This section documents Strapi's Playwright end-to-end (e2e) test suite. Each page summarises the scenarios covered by the specs in one feature area of `tests/e2e/tests/`, so contributors can see at a glance what is exercised, what isn't, and where to add coverage.

## How this is organised

The specs live under `tests/e2e/tests/` and are grouped by feature area. This documentation mirrors that layout — one page per feature area, with specs grouped by subfolder where the source tree does the same. Every `.spec.ts` file in the suite is covered; each entry lists the spec's purpose, its preconditions (seeded data, login state, feature flags), and every individual `test()` case grouped under its `describe()`.

## Sections

- [Admin](./01-admin.md) — authentication, signup/login, API and transfer tokens, home and guided tour.
- [Content Manager](./02-content-manager.md) — CRUD flows, edit/list views, bulk actions, blocks, relations-on-the-fly, conditional fields, history, preview, uniqueness.
- [Content Releases](./03-content-releases.md) — release creation, scheduling, entry management (EE-only).
- [Content-Type Builder](./04-content-type-builder.md) — creating and editing collection types, single types, and components.
- [i18n](./05-i18n.md) — locale management, localised fields, permissions, AI translation.
- [Media Library](./06-media-library.md) — asset and folder management, including the `future/` specs gated by `UNSTABLE_MEDIA_LIBRARY`.
- [Review Workflows](./07-review-workflows.md) — stages, permissions and content-manager integration (EE-only).
- [Search](./08-search.md) — content-type search in the Content Manager.
- [Settings](./09-settings.md) — general settings smoke test and the RBAC role/action/scenario suite.

## Running the tests

From the repo root:

```bash
yarn test:e2e            # run the full e2e suite
yarn test:e2e -c 4       # limit concurrent test apps to 4
yarn test:e2e:clean      # regenerate test apps (after template changes)
```

The suite shares infrastructure with the CLI tests — see `tests/e2e/README.md` and the [e2e contributor guide](../guides/e2e) for details on writing and maintaining specs.

## Conventions used in these pages

- **Purpose** — one sentence describing what a spec validates.
- **Preconditions** — setup applied in `beforeEach` / `beforeAll` (seeded fixtures such as `with-admin`, forced login, `describeOnCondition` gating on edition or feature flags, rate-limit or file-reset hooks, and so on).
- **Scenarios covered** — each individual `test()` listed under its parent `describe()` block, with a short description of what it verifies. `test.fixme` and `test.skip` cases are flagged explicitly.

If you add or rename a spec, update the corresponding page so this index stays honest.
