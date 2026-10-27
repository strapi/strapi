---
title: '@strapi/typescript-utils'
sidebar_label: 'typescript'
description: 'TypeScript support utilities for Strapi applications'
package: '@strapi/typescript-utils'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Provides TypeScript compilation utilities and code generators for Strapi. Used internally by the Strapi CLI to compile TypeScript projects and generate boilerplate code for APIs, controllers, services, and content types.

## Key concepts

- **Compiler interface**: `compile()` function compiles TypeScript in a source directory using detected tsconfig. Supports configurable compiler options. See [compile.ts](https://github.com/strapi/strapi/tree/develop/packages/utils/typescript).
- **Compilers**: Basic TypeScript compiler and common utilities for handling configuration, paths, and diagnostics.
- **Generators**: Templates and utilities to scaffold API routes, controllers, services, models, components, and content types.

## Attribute modifiers

The schema generators (`src/generators/common/models/attributes.ts`) write each attribute as its base type, such as `Schema.Attribute.String`, intersected with one modifier per schema option: `Required`, `Private`, `Unique`, `Configurable`, `CustomField`, `SetPluginOptions`, `SetMinMax`, `SetMinMaxLength` and `DefaultTo`. `DefaultTo` is written only for a literal default: a function or `null` default writes nothing.

`@strapi/types` reads these modifiers. `Required` and `DefaultTo` decide which keys the strict Document Service write inputs require (see [document write path](../../../architecture/05-document-write-path.md#validation)).

With `typescript.strictTypes`, the generators also write `Schema.Attribute.Conditional` on an attribute with a `conditions.visible` rule. A hidden field skips validation, so the strict write inputs make a conditional attribute optional and nullable. With strict types, each attribute also gets a JSDoc line with its write rule when it has one, for example ``Required when published. `null` only in drafts.`` (`getAttributeWriteRule`). Editors show it on the input keys of the Document Service. Without strict types, the generators write no strict-only modifier and no comment, and generated files stay as in previous releases. Unit tests in `src/__tests__/generators/schemas/` check both outputs.

## Application contracts

With `typescript.strictTypes`, the services generator (`src/generators/services/`) registers each `api::*` service in `Strapi.Registries.AppServices`. When the service module exports a type named `ServiceContract`, the generator registers that type. The controllers generator does the same with `ControllerContract` in `AppControllers`. Otherwise it registers the type that the default export provides (see [public registries](../../core/types/type-system/02-concepts/03-public-registry.mdx)), and lists the uid in `Strapi.Registries.InferredServices` or `InferredControllers`, with the value `true`. `Core.ServiceFactory` and `Core.ControllerFactory` reject those uids: the registered type is read from the factory, so checking the factory against it would be circular. The marker interface is not emitted when no uid needs it.

`scanSources` (`src/generators/common/sources.ts`) parses once, with `ts.createSourceFile`, the file TypeScript reads for the import of each source (`typesFileOf`), without a type checker, and the generators read only its top-level statements. A program would need the application's tsconfig and its whole dependency graph, and type generation runs on every `strapi develop` start. A source that cannot be read logs a warning, so the generation does not stop: a TypeScript source registers the type its import provides, a JS source `unknown`.

The file read for a source (`typesFileOf`):

- a `.ts` source: the source itself;
- a `.js` source: a sibling `<name>.d.ts`, which the import resolves to first, with or without `allowJs`;
- else the `.js` source itself, parsed as JavaScript, when the application's tsconfig enables `allowJs`: TypeScript infers the type of its module, JSDoc included;
- else none: the import does not resolve (an error type, which no conditional type maps to `unknown`), and the source registers `unknown` without an import.

`generate()` reads `allowJs` once, with `ts.getParsedCommandLineOfConfigFile` on `getConfigPath(appDir)`, and only when one of the four application module artifacts is enabled. It is `false` without a tsconfig (a JavaScript application) and when the tsconfig has errors. It does not use `resolveConfigOptions`, which exits the process on tsconfig errors. In a TypeScript application, a JS source only reaches `dist`, and so the registries the generators filter on, with `allowJs`.

The scan gives each source a module shape (`ModuleShape`), which decides how the services, controllers, policies and middlewares generators import it (`moduleTypeOf`):

- `default`, an ECMAScript module with a default export, and `no-default`, one without: `typeof import('<source>')`. Services and controllers without a default export resolve to `unknown`. Policies and middlewares without one are left out of their registry (`omitSourcesWithoutDefault`), with a warning that names the file: runtime registers `undefined` for them, so a reference fails at startup.
- `export-equals`, a TypeScript `export =`: `{ default: typeof import('<source>') }`, the value `importDefault` (`@strapi/utils`) returns for the compiled module.
- `commonjs`, a file without `import` or `export`, or one that assigns `module.exports`: `unknown`, without an import. TypeScript does not type `module.exports` in a `.ts` file, and importing a file without ECMAScript module syntax fails with TS2306 in the generated file, which stops the `strapi develop` compilation (`noEmitOnError`). A `.js` file read with `allowJs` is the exception: without ECMAScript module syntax and with a top-level `module.exports = …`, `module.exports.<name> = …` or `exports.<name> = …`, TypeScript types its exports, and the generators import it as `{ default: typeof import('<source>') }`, like `export =`. A `.js` file that mixes both syntaxes, or assigns its exports only in a nested block, registers `unknown`.

A JS source typed from a sibling `.d.ts` takes the shape of the declaration file. `omitSourcesWithoutDefault` keeps it even when that shape is `no-default`: the JS module may be CommonJS, which registers its exports object.

`findTypeExports` reads the contract export from the same statements: `export type`, `export interface` and export specifiers. A generic declaration counts only with a default for each type parameter, since the generated file references it without type arguments (TS2314). An export specifier without `from` is checked against the top-level declaration it names (`typeExportOf`): a type alias, an interface or a class follows the same rule, an enum counts, and a variable or a function only is skipped with a warning (TS2694). An imported binding and a re-export from another module are not followed and count. The cost is that `export *` is not followed.

`toImportSpecifier` (same file) writes the import of each source relative to `types/generated`, with the extension of the compiled file (`.ts` → `.js`). ECMAScript module applications resolved with `NodeNext` need it (TS2835), and the other module resolutions map it back to the source. `yarn test:types:registries` compiles the four generated files in CommonJS applications with Node, Bundler and NodeNext resolution, and in an ECMAScript module application with NodeNext.

## Related
