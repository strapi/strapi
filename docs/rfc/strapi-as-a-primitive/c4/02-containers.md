# C4 L2 — Containers

"Containers" here are the **packages / deployable+importable units** and the runtime
process. For a primitive, the "container" is mostly _your Node process_ that imports
`@strapi/strapi`.

```mermaid
graph TB
    subgraph userProc["User's Node process"]
        appFile["app definition<br/>(defineApp(...) — your code)"]
        runtime["@strapi/strapi (façade)<br/>defineApp · defineConfig · fromDisk<br/>startStrapi · createStrapi · /attributes · /plugins"]
    end

    subgraph core["@strapi/core"]
        appdef["app-definition module<br/>(new)"]
        loaders["loaders (refactored:<br/>path-parametric cores + legacy wrappers)"]
        strapiClass["Strapi class<br/>(DI container, lifecycle)"]
        providers["providers<br/>(registries, admin, coreStore, …)"]
    end

    db["@strapi/database"]
    types["@strapi/types"]
    utils["@strapi/utils"]
    admin["@strapi/admin/strapi-server<br/>(always loaded; panel build Phase 2)"]
    pluginPkgs["@strapi/plugin-*<br/>(imported by user in programmatic mode)"]

    appFile -->|"is a"| appdef
    appFile -->|"import { ... }"| runtime
    runtime -->|"re-exports"| appdef
    runtime -->|"createStrapi / startStrapi"| strapiClass
    strapiClass --> providers
    providers --> loaders
    loaders --> appdef
    strapiClass --> db
    appdef --> types
    appdef --> utils
    providers --> admin
    appFile -.->|"import & add (ADR-0006)"| pluginPkgs
    runtime --> pluginPkgs
```

## Containers / units

| Unit                              | Type                   | Responsibility                                                                                                                                                  | Change                               |
| --------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **User Node process**             | Runtime                | Imports `@strapi/strapi`, builds an `AppDefinition`, calls `startStrapi`. Owns TS execution (tsx / ts-node / build) — ADR-0009.                                 | New usage pattern.                   |
| **`@strapi/strapi`**              | Package (façade)       | Public surface. Re-exports the programmatic API from core; adds subpath exports `./attributes` and `./plugins`. CLI (`strapi start`) brand-detects `defineApp`. | New exports; CLI `start` brand path. |
| **`@strapi/core`**                | Package (engine)       | Hosts the new `app-definition` module, the refactored loaders, the `Strapi` class, and providers. All runtime logic lives here (ADR-0005).                      | New module + loader refactor.        |
| **`@strapi/database`**            | Package                | Persistence/ORM. Built lazily from `config.get('database')`.                                                                                                    | None.                                |
| **`@strapi/types`**               | Package                | Source of truth for schema/attribute types reused by the attribute builders.                                                                                    | Reused; possibly extended.           |
| **`@strapi/admin/strapi-server`** | Package (provider dep) | Always loaded as a provider; registers `admin::user`. Panel build/serve is Phase 2.                                                                             | None in Phase 1 (ADR-0007).          |
| **`@strapi/plugin-*`**            | Packages               | In programmatic mode, imported by the user and added to the `plugins` map; no `package.json` scan.                                                              | New consumption pattern (ADR-0006).  |

## Packaging detail (`@strapi/strapi` exports)

```jsonc
// conceptual additions to packages/core/strapi/package.json "exports"
{
  ".": {
    /* existing: createStrapi, factories, … + defineApp, defineConfig, fromDisk, startStrapi */
  },
  "./attributes": {
    /* NEW: is.* attribute builders */
  },
  "./plugins": {
    /* NEW: recommendedPlugins() preset (imports-only) */
  },
}
```

- `defineApp`, `defineConfig`, `fromDisk`, `startStrapi`, `isAppDefinition`,
  `createStrapi`, and types are exported from the root.
- `./attributes` is its own entry so `import * as is from '@strapi/strapi/attributes'`
  stays tree-shakeable and reads cleanly.
- `./plugins` exposes `recommendedPlugins()` — _just imports_ under the hood, no scan.

## Runtime sequence (programmatic)

```mermaid
sequenceDiagram
    participant U as user code
    participant F as @strapi/strapi
    participant S as Strapi class (@strapi/core)
    participant L as loaders
    participant DB as @strapi/database

    U->>F: defineApp({...}) -> branded AppDefinition
    U->>F: startStrapi(app)
    F->>S: createStrapi({ app })
    Note over S: STAGE 1 (constructor)\nloadConfiguration merges app.config\nbuild config/logger/server/db(lazy)
    F->>S: load() = register() + bootstrap()
    S->>L: loadApplicationContext (register)
    Note over L: programmatic branch\nnormalize CTs/routes/...\nimport-and-add plugins
    L-->>S: registries populated
    S->>DB: bootstrap → db.init({models}) → schema.sync
    S->>S: initMiddlewares · initRouting · RBAC · user lifecycles
    F->>S: start() → listen (headless)
```

See [L3 — Components](./03-components.md) to zoom into `@strapi/core`.
