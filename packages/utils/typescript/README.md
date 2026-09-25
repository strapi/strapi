# @strapi/typescript-utils

TypeScript compilation, configuration, and type-generation utilities for Strapi.

## Server configuration requirements

Extending `@strapi/typescript-utils/tsconfigs/server` without overriding its build-info path requires **TypeScript 5.5 or later**. The preset uses `${configDir}` to keep `.tsbuildinfo` in the consuming project's configuration directory, rather than writing it into the shared installed preset. This substitution was introduced in [TypeScript 5.5](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#the-configdir-template-variable-for-configuration-files).

The compiler used internally by this package is declared in its `typescript` dependency. A separately installed `tsc` command or an editor's selected compiler can be a different version; the package dependency does not enforce the version of those external tools. Select TypeScript 5.5 or later when using this preset unchanged with such tools.

### Projects using an older external compiler

An older compiler does not expand `${configDir}`. To keep using an older external compiler, override `tsBuildInfoFile` in the **project's own** `tsconfig.json`:

```json
{
  "extends": "@strapi/typescript-utils/tsconfigs/server",
  "compilerOptions": {
    "tsBuildInfoFile": "./.tsbuildinfo"
  }
}
```

Relative paths declared in that project configuration resolve against its directory. The override therefore preserves a separate project-local cache without requiring `${configDir}` support. Keep the project's existing `outDir`, `rootDir`, `include`, and `exclude` settings alongside this override.

This override addresses the build-info path only; it does not guarantee that all application code or dependencies support an older TypeScript version.
