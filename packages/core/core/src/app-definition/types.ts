import type { Core, Schema, Struct } from '@strapi/types';

import type { APP_DEFINITION, PLUGIN_DEFINITION } from './brand';
import type { DiskSource, Source } from './sources';
import type { RouteBuilder } from './routes';
import type { AppConfig } from './config';

/**
 * A strict, explicit programmatic content type (ADR-0004).
 *
 * Both `singularName` and `pluralName` are required — there is no
 * auto-pluralization in programmatic mode.
 */
export interface AppContentType {
  /** REQUIRED — no auto-pluralization (ADR-0004). Must be kebab-case. */
  singularName: string;
  /** REQUIRED. Must be kebab-case. */
  pluralName: string;
  /** Human-friendly label. */
  displayName: string;
  /** Attribute map (use the `is.*` builders from `@strapi/strapi/attributes`). */
  attributes: Record<string, Schema.Attribute.AnyAttribute>;

  /** default 'collectionType'. */
  kind?: 'collectionType' | 'singleType';
  /** default = singularName (ADR-0011); override to group CTs under one API namespace. */
  apiName?: string;
  /** explicit collection name; defaults to singularName when omitted. */
  collectionName?: string;
  description?: string;
  options?: Struct.SchemaOptions;
  pluginOptions?: object;

  /** Auto-CRUD default-on; `false` exposes only custom routes (ADR-0003). */
  api?: boolean;
}

/**
 * A strict, explicit programmatic component (ADR-0004, Phase 3).
 *
 * Mirrors the file-based component schema, but the identity is given explicitly
 * as a single `uid` (`<category>.<name>`) instead of being derived from a
 * directory + filename. Use {@link defineComponent} to author one with full
 * typing + startup validation.
 */
export interface AppComponent {
  /**
   * REQUIRED — `<category>.<name>`, both kebab-case (e.g. `default.dish`). This
   * is the value referenced from a `component` attribute
   * (`is.component({ component: 'default.dish' })`). There is no derivation from
   * a filename in programmatic mode (ADR-0004).
   */
  uid: string;
  /** Human-friendly label shown in the admin. */
  displayName: string;
  /** Attribute map (use the `is.*` builders from `@strapi/strapi/attributes`). */
  attributes: Record<string, Schema.Attribute.AnyAttribute>;

  /** Explicit DB table name; defaults to `components_<category>_<name>` when omitted. */
  collectionName?: string;
  description?: string;
  /** `@strapi/icons` name shown in the admin component picker. */
  icon?: string;
  options?: Struct.SchemaOptions;
  /** Explicit global id; defaults to the file-based loader's formula when omitted. */
  globalId?: string;
}

/**
 * A plugin module is the existing `strapi-server` contract — either the plain
 * object or a factory called with `{ env }` like legacy.
 */
export type PluginModule = Core.Plugin | ((opts: { env: unknown }) => Core.Plugin);

/**
 * A plugin map entry: a bare module, or a module with enable/config options.
 *
 * `resolve` is an optional hint — the npm package base specifier (e.g.
 * `@strapi/content-manager`) — used **only** by the admin build (`buildAdmin`)
 * to import the plugin's `strapi-admin` frontend entry. It is ignored at
 * runtime. When omitted, `buildAdmin` falls back to the `@strapi/<name>` and
 * `<name>` conventions, and skips the plugin if no `strapi-admin` export is
 * resolvable.
 */
export type PluginEntry =
  | PluginModule
  | { plugin: PluginModule; enabled?: boolean; config?: object; resolve?: string };

/**
 * The input accepted by {@link definePlugin}: a plugin module plus its canonical
 * `name`. Because the name travels on the value (not a map key), a definePlugin
 * result can be used in the array form `plugins: [definePlugin({ ... })]`.
 *
 * `resolve` is the same admin-build hint as on {@link PluginEntry} (the npm
 * package base used to import the plugin's `strapi-admin` frontend entry).
 */
export interface DefinePluginInput {
  /** Canonical plugin name (kebab-case). Becomes the registry key and `plugin::<name>.*` UIDs. */
  name: string;
  /** The `strapi-server` export (object or `{ env }` factory). */
  plugin: PluginModule;
  /** default `true`; `false` keeps the entry present but off. */
  enabled?: boolean;
  /** User config merged over the plugin's `config.default` (then validated). */
  config?: object;
  /** npm package base used by the admin build to import `strapi-admin`. */
  resolve?: string;
}

/**
 * A branded plugin definition produced by {@link definePlugin}. Carries its
 * canonical `name` on the value so it can be used positionally in the array
 * form `plugins: [definePlugin({ ... })]` (ADR-0006). Normalized back into the
 * name-keyed map internally, so the runtime registry (`plugin::<name>.*`) and
 * the admin `resolve` hint line up exactly as with the map form.
 */
export interface DefinedPlugin extends DefinePluginInput {
  readonly [PLUGIN_DEFINITION]: true;
}

/**
 * Accepted shapes for the programmatic `plugins` field: the name-keyed map, the
 * array of {@link definePlugin} results, or a `fromDisk()` legacy-discovery
 * bridge.
 */
export type PluginsInput = Record<string, PluginEntry> | DefinedPlugin[] | DiskSource;

/**
 * A lifecycle function composed into `strapi.app` and run by `runUserLifecycles`.
 */
export type Lifecycle = (ctx: { strapi: Core.Strapi }) => void | Promise<void>;

/**
 * The full programmatic app definition, produced by `defineApp(...)`.
 */
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

  /**
   * In-code components (via {@link defineComponent}) or a `fromDisk` source.
   * A content type's `component` attribute references a component by its `uid`
   * (`<category>.<name>`); that component must be provided here or loaded from
   * disk (ADR-0004).
   */
  components?: Source<AppComponent[]>;

  /**
   * Import-and-add plugins (ADR-0006). Either a map keyed by canonical name, an
   * array of {@link definePlugin} results (each carrying its own name), or a
   * `fromDisk()` bridge to legacy discovery.
   */
  plugins?: PluginsInput;

  /** Fill any unspecified resource from one project root (ADR-0010). */
  from?: DiskSource;

  /** Lifecycles composed into strapi.app and run by runUserLifecycles. */
  register?: Lifecycle;
  bootstrap?: Lifecycle;
  destroy?: Lifecycle;
}

/**
 * The input accepted by `defineApp` (everything except the internal brand).
 */
export type AppInput = Omit<AppDefinition, typeof APP_DEFINITION>;
