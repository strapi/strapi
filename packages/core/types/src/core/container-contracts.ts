import type { Model } from '@strapi/database';
import type { queryParams } from '@strapi/utils';
import type { PropertyPath } from 'lodash';

import type * as Modules from '../modules';
import type * as Struct from '../struct';
import type * as UID from '../uid';
import type { Controller } from './controller';
import type { Middleware } from './middleware';
import type { Module } from './module';
import type { Policy } from './policy';
import type { RouterConfig } from './router';
import type { Service } from './service';
import type { Strapi } from './strapi';

/*
 * Contracts of the values `@strapi/core` adds to the container under a name, for the values whose
 * type `@strapi/types` did not declare yet: what `strapi.get(name)` returns. Each one is written from
 * its implementation, and `@strapi/core` checks that the implementation is assignable to it
 * (`packages/core/core/src/__type-tests__/container-contracts.ts`).
 */

/** `strapi.get('query-params')`: turns REST query parameters into a query of the query engine. */
export interface QueryParamsService {
  transform(uid: string, params: queryParams.Params): queryParams.Query;
}

/** Where an encoded value comes from, as the content source maps of the preview read it. */
type FieldSourceMap = {
  path: string;
  type: Struct.SchemaAttributes[string]['type'];
  documentId: string;
  locale: string | null;
  model?: UID.Schema;
  kind?: Struct.ContentTypeKind;
  fieldPath?: string;
};

/** `strapi.get('content-source-maps')`: stega-encodes where response fields come from. */
export interface ContentSourceMapsService {
  encodeField(text: string, metadata: FieldSourceMap): string;
  /** Encodes the first text leaf, or the image alt text, of each block of a blocks field. */
  encodeBlocks(
    blocks: unknown,
    metadata: Omit<FieldSourceMap, 'path' | 'type'> & { fieldPath: string }
  ): unknown;
  encodeEntry(info: { data: unknown; schema: Struct.Schema }): Promise<unknown>;
  /** Encodes an entry or a list of entries; returns `data` unchanged when encoding fails. */
  encodeSourceMaps(info: { data: unknown; schema: Struct.Schema }): Promise<unknown>;
}

/** `strapi.get('content-structure')`: the content groups of the application (`groups.json`). */
export interface ContentStructureService {
  read(): Promise<Modules.ContentStructure.ContentStructureFile | null>;
  getCleanedFile(): Promise<Modules.ContentStructure.ContentStructureFile | null>;
  resolve(): Promise<Modules.ContentStructure.ResolvedContentStructure>;
  write(structure: Modules.ContentStructure.ContentStructureFile): Promise<void>;
  /** Throws when `value` is not a valid content structure file. */
  validate(value: unknown): Modules.ContentStructure.ContentStructureFile;
  invalidate(): void;
  countGroups(): Promise<number>;
}

/**
 * `strapi.get('content-types')`: the content type schemas keyed by UID.
 *
 * @internal Read through `strapi.contentTypes` and `strapi.contentType(uid)`. Not a plugin API.
 */
export interface ContentTypesRegistry {
  keys(): string[];
  get(uid: string): Struct.ContentTypeSchema;
  getAll(namespace: string): Record<string, Struct.ContentTypeSchema>;
  set(uid: string, contentType: Struct.ContentTypeSchema): ContentTypesRegistry;
  /** Throws when a content type of the namespace is already registered. */
  add(namespace: string, contentTypes: Record<string, unknown> | undefined): void;
  /**
   * Calls `extendFn` with the registered schema, which it mutates: its result is ignored. Throws when
   * the content type is not registered.
   */
  extend(
    uid: string,
    extendFn: (contentType: Struct.ContentTypeSchema) => unknown
  ): ContentTypesRegistry;
}

/**
 * `strapi.get('components')`: the component schemas keyed by UID.
 *
 * @internal Read through `strapi.components`. Not a plugin API.
 */
export interface ComponentsRegistry {
  keys(): UID.Component[];
  get(uid: UID.Component): Struct.ComponentSchema;
  getAll(): Record<UID.Component, Struct.ComponentSchema>;
  /** Throws when the component is already registered. */
  set(uid: UID.Component, component: Struct.ComponentSchema): ComponentsRegistry;
  add(components: Record<UID.Component, Struct.ComponentSchema>): void;
}

/** A service as a package registers it: a factory called once with `{ strapi }`, or the service. */
export type ServiceFactoryInput = ((params: { strapi: Strapi }) => Service) | Service;

/**
 * `strapi.get('services')`: the services keyed by UID, instantiated on first read.
 *
 * @internal Read through `strapi.service(uid)` and `strapi.services`. Not a plugin API.
 */
export interface ServicesRegistry {
  keys(): string[];
  get(uid: string): Service | undefined;
  getAll(namespace: string): Record<string, Service>;
  set(uid: string, service: ServiceFactoryInput): ServicesRegistry;
  /** Throws when a service of the namespace is already registered. */
  add(
    namespace: string,
    services: Record<string, ServiceFactoryInput> | undefined
  ): ServicesRegistry;
  /** Throws when the service is not registered. */
  extend(uid: string, extendFn: (service: Service) => Service): ServicesRegistry;
}

/** A controller as a package registers it: a factory called once with `{ strapi }`, or the controller. */
export type ControllerFactoryInput = ((params: { strapi: Strapi }) => Controller) | Controller;

/**
 * `strapi.get('controllers')`: the controllers keyed by UID, instantiated on first read.
 *
 * @internal Read through `strapi.controller(uid)` and `strapi.controllers`. Not a plugin API.
 */
export interface ControllersRegistry {
  keys(): string[];
  get(uid: string): Controller | undefined;
  getAll(namespace: string): Record<string, Controller>;
  set(uid: UID.Controller, controller: ControllerFactoryInput): ControllersRegistry;
  /** Throws when a controller of the namespace is already registered. */
  add(
    namespace: string,
    controllers: Record<string, ControllerFactoryInput> | undefined
  ): ControllersRegistry;
  /** Throws when the controller is not registered. */
  extend(
    uid: UID.Controller,
    extendFn: (controller: Controller) => Controller
  ): ControllersRegistry;
}

/** A policy of a route config: its name, or its name and the config it receives. */
type PolicyReference = string | { name: string; config: unknown };

/** Where a relative policy name is looked up: `plugin::<pluginName>.<name>` or `api::<apiName>.<name>`. */
type PolicyNamespaceInfo = { pluginName?: string; apiName?: string };

/**
 * `strapi.get('policies')`: the policies keyed by UID.
 *
 * @internal Read through `strapi.policy(name)` and `strapi.policies`. Not a plugin API.
 */
export interface PoliciesRegistry {
  keys(): string[];
  get(name: string, namespaceInfo?: PolicyNamespaceInfo): Policy | undefined;
  has(name: string, namespaceInfo?: PolicyNamespaceInfo): boolean;
  getAll(namespace: string): Record<string, Policy>;
  set(uid: string, policy: Policy): PoliciesRegistry;
  /** Throws when a policy of the namespace is already registered. */
  add(namespace: string, policies: Record<string, Policy> | undefined): void;
  /**
   * Resolves each policy to its handler function, after running its validator on its config. Throws
   * when a policy is not registered or has no handler.
   */
  resolve(
    config: PolicyReference | PolicyReference[],
    namespaceInfo?: PolicyNamespaceInfo
  ): { handler: Extract<Policy, (...args: never[]) => unknown>; config: unknown }[];
}

/**
 * `strapi.get('middlewares')`: the middlewares keyed by UID.
 *
 * @internal Read through `strapi.middleware(name)` and `strapi.middlewares`. Not a plugin API.
 */
export interface MiddlewaresRegistry {
  keys(): string[];
  get(uid: string): Middleware;
  getAll(namespace: string): Record<string, Middleware>;
  set(uid: UID.Middleware, middleware: Middleware): MiddlewaresRegistry;
  /** Throws when a middleware of the namespace is already registered. */
  add(namespace: string, middlewares?: Record<string, Middleware>): void;
  /** Throws when the middleware is not registered. */
  extend(
    uid: UID.Middleware,
    extendFn: (middleware: Middleware) => Middleware
  ): MiddlewaresRegistry;
}

/**
 * A module the modules registry holds: an API, a plugin or the admin, with its lifecycles and the
 * entries registered under its namespace. Lookups read the registries, so a name without an entry
 * resolves to `undefined`.
 *
 * @internal Read through `strapi.api(name)`, `strapi.plugin(name)` and `strapi.admin`. Not a plugin API.
 */
export interface RegisteredModule {
  /** Throws when called twice, as `register` and `destroy` do. */
  bootstrap(): Promise<void>;
  register(): Promise<void>;
  destroy(): Promise<void>;
  isDestroyed(): boolean;
  /** Registers the module's content types, services, policies, middlewares, controllers and config. */
  load(): void;
  /** Routers, or factories called with `{ strapi }` when the routes are registered. */
  routes: Record<string, RouterConfig>;
  /** Reads a key or path of the module's config, under its namespace. */
  config(key: PropertyPath, defaultValue?: unknown): unknown;
  contentType(name: string): Struct.ContentTypeSchema;
  contentTypes: Record<string, Struct.ContentTypeSchema>;
  service(name: string): Service | undefined;
  services: Record<string, Service>;
  policy(name: string): Policy | undefined;
  policies: Record<string, Policy>;
  middleware(name: string): Middleware | undefined;
  middlewares: Record<string, Middleware>;
  controller(name: string): Controller | undefined;
  controllers: Record<string, Controller>;
}

/**
 * A module as an API, a plugin or the admin declares it. Routers may be factories, called with
 * `{ strapi }` when the routes are registered, as a loaded plugin's.
 *
 * @internal Not a plugin API: plugins declare their server entry with `Plugin.LoadedPlugin`.
 */
export interface RawModuleInput {
  config?: Record<string, unknown>;
  routes?: Record<string, RouterConfig>;
  controllers?: Record<string, ControllerFactoryInput>;
  services?: Record<string, ServiceFactoryInput>;
  contentTypes?: Module['contentTypes'];
  policies?: Module['policies'];
  middlewares?: Module['middlewares'];
  bootstrap?: (params: { strapi: Strapi }) => void | Promise<void>;
  register?: (params: { strapi: Strapi }) => void | Promise<void>;
  destroy?: (params: { strapi: Strapi }) => void | Promise<void>;
}

/**
 * `strapi.get('modules')`: the loaded modules keyed by namespace (`api::<name>`, `plugin::<name>`,
 * `admin`).
 *
 * @internal Not a plugin API.
 */
export interface ModulesRegistry {
  get(namespace: string): RegisteredModule;
  getAll(prefix?: string): Record<string, RegisteredModule>;
  /** Creates and loads the module. Throws when the namespace is already registered. */
  add(namespace: string, rawModule: RawModuleInput): RegisteredModule;
  bootstrap(): Promise<void>;
  register(): Promise<void>;
  /** Destroys the modules that are not destroyed yet. */
  destroy(): Promise<void>;
}

/**
 * `strapi.get('plugins')`: the loaded plugins keyed by name.
 *
 * @internal Read through `strapi.plugin(name)` and `strapi.plugins`. Not a plugin API.
 */
export interface PluginsRegistry {
  /** The module registered under `plugin::<name>`. */
  get(name: string): RegisteredModule;
  getAll(): Record<string, RegisteredModule>;
  /**
   * Adds the module of the loaded plugin definition under `plugin::<name>` and returns it. Throws when
   * the plugin is already registered.
   */
  add(name: string, plugin: RawModuleInput): RegisteredModule;
}

/**
 * `strapi.get('custom-fields')`: the custom fields keyed by UID (`plugin::<plugin>.<name>`, or
 * `global::<name>` without a loaded plugin).
 *
 * @internal Plugins register custom fields with `strapi.customFields.register`. Not a plugin API.
 */
export interface CustomFieldsRegistry {
  getAll(): Record<string, Modules.CustomFields.CustomFieldServerOptions>;
  /** The options the custom field was registered with. Throws when it is not registered. */
  get(uid: string): Modules.CustomFields.CustomFieldServerOptions;
  /** Throws when a custom field is invalid or already registered. */
  add(
    customField:
      | Modules.CustomFields.CustomFieldServerOptions
      | Modules.CustomFields.CustomFieldServerOptions[]
  ): void;
}

/**
 * `strapi.get('apis')`: the loaded APIs keyed by name.
 *
 * @internal Read through `strapi.api(name)` and `strapi.apis`. Not a plugin API.
 */
export interface ApisRegistry {
  get(name: string): unknown;
  getAll(): Record<string, unknown>;
  /** Adds the API's module under `api::<name>`. Throws when the API is already registered. */
  add(apiName: string, apiConfig: unknown): unknown;
}

/**
 * `strapi.get('models')`: the database models of the internal tables, which are not content types.
 *
 * @internal Not a plugin API.
 */
export interface ModelsRegistry {
  add(model: Model): ModelsRegistry;
  get(): Model[];
}
