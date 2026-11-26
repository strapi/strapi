import type * as Struct from '../../struct';
import type { ContentType } from '../../schema';
import type { Controller } from '../controller';
import type { ModuleRoutes, PluginRoutes, Router } from '../router';
import type { Strapi as StrapiInstance } from '../strapi';
import type { Equal, Expect } from '../../../tests/helpers/assert';

declare const strapi: StrapiInstance;
declare const dynamicName: string;

// A loaded plugin or API is the module `@strapi/core` built from its declaration: its content types
// are the schemas, keyed by name (no `{ schema }` envelope), and `contentType(name)` reads one.
const plugin = strapi.plugin('i18n');
const api = strapi.api('article');
const dynamicApi = strapi.api(dynamicName);
const pluginLocale = plugin.contentTypes.locale;
const apiArticle = api.contentTypes.article;
const pluginContentType = plugin.contentType('locale');
const apiContentType = dynamicApi.contentType('article');

declare const loadedContentTypes: [
  Expect<Equal<typeof pluginLocale, Struct.ContentTypeSchema>>,
  Expect<Equal<typeof apiArticle, Struct.ContentTypeSchema>>,
  Expect<Equal<typeof pluginContentType, Struct.ContentTypeSchema>>,
  Expect<Equal<typeof apiContentType, Struct.ContentTypeSchema>>,
];
loadedContentTypes satisfies unknown;

pluginLocale.uid satisfies string;
apiArticle.attributes satisfies Struct.ContentTypeSchema['attributes'];
// @ts-expect-error A loaded content type has no `schema` envelope: it is the schema.
pluginLocale.schema satisfies unknown;
// @ts-expect-error A loaded content type has no `schema` envelope: it is the schema.
apiArticle.schema satisfies unknown;

// Only `@strapi/core` calls the lifecycles of a loaded module, once: they are not part of the loaded
// plugin or API type. A plugin's undeclared members are `unknown`; an API has none.
type Has<T, TKey extends string> = TKey extends keyof T ? true : false;
declare const loadedLifecycles: [
  Expect<Equal<(typeof plugin)['bootstrap'], unknown>>,
  Expect<Equal<(typeof plugin)['register'], unknown>>,
  Expect<Equal<(typeof plugin)['destroy'], unknown>>,
  Expect<Equal<(typeof plugin)['load'], unknown>>,
  Expect<Equal<Has<typeof api, 'bootstrap' | 'register' | 'destroy' | 'load'>, false>>,
];
loadedLifecycles satisfies unknown;

// The routes are what the module declared until Strapi registers them: see `module-routes.test.ts`.
declare const loadedRoutes: [
  Expect<Equal<(typeof api)['routes'], ModuleRoutes>>,
  Expect<Equal<(typeof plugin)['routes'], PluginRoutes>>,
];
loadedRoutes satisfies unknown;

// `strapi.admin` is the admin declaration, not a module built by `@strapi/core`: declared content
// types (`{ schema }`), lifecycles called with `{ strapi }`, a config object, and no lookups.
const admin = strapi.admin;
const adminContentType = admin.contentTypes.user;
const adminConfig = admin.config;
declare const adminDeclaration: [
  Expect<Equal<typeof adminContentType, { schema: ContentType }>>,
  Expect<Equal<typeof adminConfig, Record<string, unknown>>>,
  Expect<Equal<(typeof admin)['routes'], Record<string, Router>>>,
  Expect<Equal<(typeof admin)['controllers'], Record<string, Controller>>>,
];
adminDeclaration satisfies unknown;
admin.bootstrap({ strapi }) satisfies void | Promise<void>;
admin.register({ strapi }) satisfies void | Promise<void>;
admin.destroy({ strapi }) satisfies void | Promise<void>;
// No `service`, `controller`, `policy` or `middleware` lookup: use `strapi.service('admin::<name>')`.
declare const adminLookups: [
  Expect<Equal<Has<typeof admin, 'service' | 'controller' | 'policy' | 'middleware'>, false>>,
];
adminLookups satisfies unknown;

// The maps Strapi builds on each read are read-only: a write would be lost (or throw). Writes go
// through the registries.
// @ts-expect-error `strapi.services` is a fresh object per read.
strapi.services[dynamicName] = {};
// @ts-expect-error `strapi.controllers` too.
strapi.controllers[dynamicName] = {};
// @ts-expect-error `strapi.contentTypes` too.
strapi.contentTypes['api::article.article'] = strapi.contentType('api::article.article');
// @ts-expect-error `strapi.policies` too.
strapi.policies[dynamicName] = () => true;
// @ts-expect-error `strapi.middlewares` too.
strapi.middlewares[dynamicName] = () => async () => {};
// @ts-expect-error `strapi.hooks` too.
strapi.hooks[dynamicName] = {};
// @ts-expect-error A module's services are a fresh object per read.
plugin.services[dynamicName] = {};
// @ts-expect-error A module's controllers too.
api.controllers[dynamicName] = {};
// @ts-expect-error A module's content types too.
api.contentTypes[dynamicName] = apiArticle;
// The maps of loaded modules stay writable: they hold the modules themselves.
strapi.plugins[dynamicName] = strapi.plugin(dynamicName);
strapi.apis[dynamicName] = strapi.api(dynamicName);
