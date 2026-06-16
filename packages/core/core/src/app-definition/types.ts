import type { Core, Schema, Struct } from '@strapi/types';

import type { APP_DEFINITION } from './brand';
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
 * A plugin module is the existing `strapi-server` contract — either the plain
 * object or a factory called with `{ env }` like legacy.
 */
export type PluginModule = Core.Plugin | ((opts: { env: unknown }) => Core.Plugin);

/**
 * A plugin map entry: a bare module, or a module with enable/config options.
 */
export type PluginEntry =
  | PluginModule
  | { plugin: PluginModule; enabled?: boolean; config?: object };

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
   * Components are available only via `fromDisk` in Phase 1 — there is no
   * programmatic `defineComponent` yet (ADR-0004 / RFC decision 18).
   */
  components?: DiskSource;

  /** Import-and-add plugins (ADR-0006). `fromDisk()` bridges to legacy discovery. */
  plugins?: Record<string, PluginEntry> | DiskSource;

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
