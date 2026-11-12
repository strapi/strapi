---
title: 'Decision: global type registries'
description: 'Why strict types declare contracts in global Strapi.Registries interfaces, the alternatives that were compared, and the known weak points.'
tags:
  - typescript
---

This page records a settled design decision for strict types. Read it before you propose another
registry design. The conventions themselves are in [TypeScript](./05-typescript.md).

## Context

Strict types let a lookup such as `strapi.service(uid)` return the contract that the package or
the application declares for `uid`. Each package declares its own contracts, and every program
must see the contracts of every installed package, whatever the package manager, the module
resolution, the file order, or the number of installed copies. Applications that do not opt in
must keep the types of the previous release, without any change on their side.

## Decision

Contracts live in global interfaces, `Strapi.Registries`, declared once by `@strapi/types`. Each
monorepo package that looks up other packages' contracts loads them through a
`server/src/registries.ts` file.

How it works:

- `@strapi/types` declares the empty interfaces in `declare global { namespace Strapi { namespace Registries { ... } } }`
  (`packages/core/types/src/index.ts`): `PackageServices`, `AppServices`, `Settings`, and the
  other registries.
- Each package declares its contracts under `server/src/types/` by augmenting the `Package*`
  interfaces, and re-exports them from its `strapi-server` entry.
- A package that looks up another package's contracts imports that package's `strapi-server`
  entry from `server/src/registries.ts` (nine packages today). The Oxlint rule
  `strapi-registries/declared-dependencies` (`packages/utils/oxlint-config/registries.ts`) rejects
  an import that is not a declared dependency.
- Contracts change lookup types only in strict mode. Applications turn it on with
  `typescript.strictTypes` in `config/typescript.ts`, and type generation then writes the files
  that set `Settings.strict`.

A global name is the only name that TypeScript merges across duplicate installs and in any file
order. That is why the design keeps it.

## Alternatives

- **Ambient module** (`declare module '<name>'` in a script file). It also merges by global name,
  so it is the same mechanism under another name. It only renames `Strapi.Registries`, and isolates
  nothing more. It stays an option if the global identifier `Strapi` is the only objection.
- **Registry owned by type generation**, where only `@strapi/strapi` augments the registry. It
  works, but it needs a build step that strips a dev-only file in every package, a larger
  generator, and plugin SDK support. With a skewed copy of a package, it drops contracts without
  an error, in more cases than the global design.
- **Explicit composition** (`Core.StrapiWith<C>`, no merging). The global `strapi` cannot be
  typed, schemas still need merging, and every injection point and factory would need a
  `TStrapi` parameter. Making `Core.Strapi` generic changes the types of applications that do not
  opt in.
- **Module augmentation** of a file-backed module, such as `@strapi/types`. An augmentation through
  a re-export merges into a clone, and with several specifiers the result depends on file order
  ([TypeScript #46617](https://github.com/microsoft/TypeScript/issues/46617)). Under pnpm, apps
  cannot resolve `@strapi/types`, and a `.d.ts` augmentation of an unresolved module is ignored
  without an error. Duplicate installs lose entries.

## Known weak points

- **Silent mistakes in `.d.ts` files.** With `skipLibCheck`, which application templates set, a
  registry file written as `.d.ts` that imports a missing declaration reports nothing, and the
  registry is empty. Mitigation: keep `registries.ts` a `.ts` file, so a missing declaration fails
  with TS2307. Generated contract files are `.ts` files for the same reason.
- **One global name.** Any declaration file in the program can augment `Strapi.Registries`.
  Mitigation: published declarations must not augment `Settings`. Type generation warns when an
  installed plugin's server entry turns strict types on.
- **All installed versions merge.** The base interfaces of every installed copy of `@strapi/types`
  merge into one. Two different contracts for one UID fail with TS2717, but `skipLibCheck` hides
  the conflict in a consumer. Mitigation: one contract per UID.
- **The `registries.ts` ceremony.** Each package lists the packages it looks up, and a missing
  import makes the lookup `unknown`. Mitigation: the lint rule keeps the list to declared
  dependencies, so the program follows the Nx build order.
- **TypeScript 7.** In TypeScript 7, `skipLibCheck` may stop hiding interface merge errors raised
  from user files, so application overrides could start to report errors
  ([typescript-go#3814](https://github.com/microsoft/typescript-go/issues/3814)). This was not
  re-checked. The monorepo uses TypeScript 5.9.3.

## Guards

- The consumer test (`tests/types/registries/consumer.test.cjs`, `yarn test:types:registries`)
  compiles the published declarations. It checks that they never activate strict mode, that
  registry contracts reference declared dependencies, that conflicting contracts report TS2717,
  and that stale generated contracts are reported even with `skipLibCheck`.
- The Oxlint rule `strapi-registries/declared-dependencies` runs on every
  `**/server/src/registries.ts` file.
- The strict-off checks keep the types of applications without strict mode unchanged:
  `yarn test:types:strict-off` (`tests/types/strict-off-parity`), the parity fixtures in
  `tests/types/registries/fixtures/parity-*.ts`, and the `Equal` assertions in
  `packages/core/types/tests/strict-off/`. Read
  [Verifying changes](./05-typescript.md#verifying-changes).
