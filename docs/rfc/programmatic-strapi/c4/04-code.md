# C4 L4 — Code

Concrete, **proposed** types and signatures for the `app-definition` module and the
integration seams. These are design sketches to anchor implementation — names and exact
shapes may shift during Phase 1, but the contracts they express are the agreed design.

> All code below is illustrative (not yet implemented). File paths are the intended
> locations under `packages/core/core/src/app-definition/` unless noted.

## Brands (`brand.ts`)

```ts
export const APP_DEFINITION = Symbol.for('strapi.appDefinition');
export const DISK_SOURCE = Symbol.for('strapi.diskSource');

export interface Branded<B extends symbol> {
  readonly [k: symbol]: true;
}

export const isAppDefinition = (v: unknown): v is AppDefinition =>
  typeof v === 'object' && v !== null && (v as any)[APP_DEFINITION] === true;

export const isDiskSource = (v: unknown): v is DiskSource =>
  typeof v === 'object' && v !== null && (v as any)[DISK_SOURCE] === true;
```

## Per-resource sources (`sources.ts`)

```ts
export interface DiskSource {
  readonly [DISK_SOURCE]: true;
  readonly path: string;
}

/** Mark a resource (or, at top level, the whole project) as loaded from disk. */
export const fromDisk = (path: string): DiskSource => ({ [DISK_SOURCE]: true, path });

/** A resource field is either an in-code value or a disk source. */
export type Source<T> = T | DiskSource;
```

## App definition (`types.ts`)

```ts
export interface AppDefinition {
  readonly [APP_DEFINITION]: true;

  /** Consumed at STAGE 1 (loadConfiguration) — see ADR-0008. */
  config?: Source<AppConfig>;

  /** Strict, explicit content types (ADR-0004). */
  contentTypes?: Source<AppContentType[]>;

  /** Route DSL factory or explicit route inputs. */
  routes?: Source<RouteBuilder | Core.RouteInput[]>;

  controllers?: Source<Record<string, Core.Controller>>;
  services?: Source<Record<string, Core.Service>>;
  policies?: Source<Record<string, Core.Policy>>;
  middlewares?: Source<Record<string, Core.Middleware>>;

  /** Import-and-add plugins (ADR-0006). `fromDisk()` bridges to legacy discovery. */
  plugins?: Record<string, PluginEntry> | DiskSource;

  /** Fill any unspecified resource from one project root (ADR-0010). */
  from?: DiskSource;

  /** Lifecycles composed into strapi.app and run by runUserLifecycles. */
  register?: Lifecycle;
  bootstrap?: Lifecycle;
  destroy?: Lifecycle;
}

type Lifecycle = (ctx: { strapi: Core.Strapi }) => void | Promise<void>;
```

### Content type (strict)

```ts
export interface AppContentType {
  singularName: string; // REQUIRED — no auto-pluralization (ADR-0004)
  pluralName: string; // REQUIRED
  displayName: string;
  attributes: Record<string, Schema.Attribute.AnyAttribute>;

  kind?: 'collectionType' | 'singleType'; // default 'collectionType'
  apiName?: string; // default = singularName (ADR-0011)
  collectionName?: string; // explicit; sensible default
  options?: Struct.ContentTypeSchemaOptions;
  pluginOptions?: object;

  /** Auto-CRUD default-on; false to expose only custom routes (ADR-0003). */
  api?: boolean;
}
```

### Plugin entry

```ts
export type PluginModule =
  | Core.Plugin // plain object form
  | (() => Core.Plugin); // factory form (called with { env } like legacy)

export type PluginEntry =
  | PluginModule
  | { plugin: PluginModule; enabled?: boolean; config?: object };
```

## Route DSL (`routes.ts`)

```ts
export interface RouteVerbs {
  get: RouteFn;
  post: RouteFn;
  put: RouteFn;
  patch: RouteFn;
  del: RouteFn; // `delete` is reserved (ADR-0012)
}

type RouteFn = (
  path: string,
  handler: Core.MiddlewareHandler,
  config?: Core.RouteConfig
) => Core.RouteInput;

export type RouteBuilder = (verbs: RouteVerbs) => Core.RouteInput[];
```

Inline handlers work because `returnBodyMiddleware` sets `ctx.body` from the return
value when unset (verified in `services/server/compose-endpoint.ts`).

## Attribute builders (`attributes.ts` → exported as `@strapi/strapi/attributes`)

```ts
export const string = (opts?: StringOptions): Schema.Attribute.String => ({
  type: 'string',
  ...opts,
});
export const text = (opts?: TextOptions): Schema.Attribute.Text => ({ type: 'text', ...opts });
export const integer = (opts?: IntegerOptions): Schema.Attribute.Integer => ({
  type: 'integer',
  ...opts,
});
// boolean, datetime, enumeration, relation, component, media, json, uid, …
```

Options/return types are derived from `@strapi/types`
(`packages/core/types/src/schema/attribute/**`) so builders stay in lock-step with the
canonical schema types.

## Public surface (`index.ts` + façade re-exports)

```ts
// @strapi/core/src/app-definition/index.ts
export function defineApp(def: Omit<AppDefinition, typeof APP_DEFINITION>): AppDefinition;
export { defineConfig, defineDatabaseConfig, defineServerConfig } from './config';
export { fromDisk } from './sources';
export { isAppDefinition } from './brand';
export type { AppDefinition, AppContentType, PluginEntry, RouteBuilder } from './types';

// @strapi/strapi/src/index.ts (façade) additionally:
export async function startStrapi(app: AppDefinition, opts?: StartOptions): Promise<Core.Strapi>;
// import * as is from '@strapi/strapi/attributes'
// import { recommendedPlugins } from '@strapi/strapi/plugins'
```

## Integration seams (existing files touched)

| File                               | Seam                      | Change                                                             |
| ---------------------------------- | ------------------------- | ------------------------------------------------------------------ |
| `core/src/Strapi.ts`               | `StrapiOptions`           | add `app?: AppDefinition`.                                         |
| `core/src/configuration/index.ts`  | `loadConfiguration(opts)` | merge `opts.app?.config`; guard missing `package.json` (ADR-0013). |
| `core/src/index.ts`                | `createStrapi`            | accept `app`, thread into options.                                 |
| `core/src/loaders/index.ts`        | `loadApplicationContext`  | branch legacy vs programmatic.                                     |
| `core/src/loaders/src-index.ts`    | `loadSrcIndex`            | brand-check before yup (ADR-0001).                                 |
| `core/src/loaders/*.ts`            | each app-content loader   | extract `loadXFromDir` core + legacy wrapper.                      |
| `strapi/package.json`              | `exports`                 | add `./attributes`, `./plugins`.                                   |
| `strapi/src/index.ts`              | façade                    | re-export programmatic API; add `startStrapi`.                     |
| `strapi/src/cli/commands/start.ts` | CLI                       | brand-detect `defineApp` default export.                           |

## Two-stage consumption (why it matters)

```text
new Strapi(opts)              // STAGE 1
  └─ loadConfiguration(opts)  // merges app.config  → config/logger/server/db(lazy)

strapi.load()
  ├─ register()               // STAGE 2
  │    └─ loadApplicationContext → runProgrammaticLoaders (content/routes/plugins)
  └─ bootstrap()              // db.init + schema.sync + routing + RBAC + user lifecycles
```

This split (ADR-0008) is the single most important code-level constraint: `config`
must be available before the container is built, while everything else is register-time.
