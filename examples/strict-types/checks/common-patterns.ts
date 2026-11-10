// Type checks only, run by `yarn test:ts` (see contracts.ts). The code typical applications and
// local plugins write, so a pattern that strict types reject shows here.
//
// Two kinds of pins:
// - Intended `unknown`: lookups of packages that declare no contract. Not a gap.
// - `@ts-expect-error GAP <unit>`: a pattern that should compile and does not yet. The named unit
//   removes the directive once the pattern compiles.
import { factories, type Core } from '@strapi/strapi';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

declare const strapi: Core.Strapi;

type IsAny<T> = 0 extends 1 & T ? true : false;

// Core factories with overrides that call the core action or method with `super`. TypeScript types
// `super` in an object literal method as `any`, whatever the factory declares: the call compiles,
// unchecked. The override's own parameters are typed.
factories.createCoreController('api::article.article', ({ strapi }) => ({
  async find(ctx) {
    const result = await super.find(ctx);
    const { data, meta } = result;
    type SuperIsAny = Core.Assert<IsAny<typeof result>>;
    type ContextIsTyped = Core.Assert<Equal<IsAny<typeof ctx>, false>>;

    return { data, meta: { ...meta, count: data.length } };
  },
  async titles() {
    return strapi.service('api::article.article').findPublishedTitles();
  },
})) satisfies Core.ControllerFactory<'api::article.article'>;

factories.createCoreService('api::article.article', () => ({
  async find(params) {
    const result = await super.find(params);
    type SuperIsAny = Core.Assert<IsAny<typeof result>>;

    return result;
  },
  async findPublishedTitles() {
    return [];
  },
})) satisfies Core.ServiceFactory<'api::article.article'>;

// A core router with route configs that reference the app's policy and middleware. The core router
// config keeps develop's unchecked references (`Core.CoreAPI.Router.RouterConfig`); a typed route
// config (`Core.RouteConfigFor`, below) checks them.
factories.createCoreRouter('api::article.article', {
  only: ['find', 'findOne'],
  config: {
    find: {
      policies: [{ name: 'global::has-role', config: { roles: ['editor'] } }],
      middlewares: [{ name: 'global::response-time', config: { header: 'x-response-time' } }],
    },
  },
});

// The document service with `populate`, `fields`, `status` and `filters`.
export async function readArticles() {
  const articles = await strapi.documents('api::article.article').findMany({
    fields: ['title'],
    populate: { cover: { fields: ['url', 'alternativeText'] } },
    status: 'published',
    filters: { title: { $containsi: 'strapi' } },
    locale: 'en',
  });
  const first = articles[0];
  first?.title satisfies string | null | undefined;
  first?.cover?.url satisfies string | null | undefined;

  const draft = await strapi
    .documents('api::article.article')
    .findOne({ documentId: 'a1', populate: ['cover'], status: 'draft' });
  draft?.cover?.mime satisfies string | null | undefined;

  await strapi.documents('api::article.article').publish({ documentId: 'a1' });
}

// Bundled packages declare their services.
export async function bundledServices() {
  const upload = strapi.plugin('upload').service('upload');
  const files = await upload.findMany({ filters: { mime: { $startsWith: 'image/' } } });
  files.map((file) => file.url) satisfies (string | undefined)[];

  await strapi.plugin('email').service('email').send({
    to: 'editor@example.com',
    subject: 'Published',
    text: 'An article was published.',
  });
  // @ts-expect-error `to` is required.
  await strapi.plugin('email').service('email').send({ subject: 'Published' });

  const locales = await strapi.plugin('i18n').service('locales').find();
  locales satisfies unknown[];
  (await strapi.plugin('i18n').service('locales').getDefaultLocale()) satisfies string | null;

  strapi.plugin('content-manager').service('document-manager') satisfies object;
  // @ts-expect-error A typo in a bundled service name is not a registered service.
  strapi.plugin('content-manager').service('document-manger') satisfies object;
}

// A TypeScript policy and middleware register their configs (`src/policies/has-role.ts`,
// `src/middlewares/response-time.ts`), and route references are checked against them.
export type Configs = [
  Core.Assert<Equal<Strapi.Registries.AppPolicies['global::has-role'], { roles: string[] }>>,
  Core.Assert<Equal<Strapi.Registries.AppMiddlewares['global::response-time'], { header: string }>>,
];
({ name: 'global::has-role', config: { roles: ['editor'] } }) satisfies Core.PolicyReference;
// @ts-expect-error `roles` is an array of strings in the policy's config.
({ name: 'global::has-role', config: { roles: 'editor' } }) satisfies Core.PolicyReference;

// Intended `unknown`: users-permissions declares no service contract yet. Its contracts are owned
// by https://github.com/strapi/strapi/pull/27928.
const jwt = strapi.plugin('users-permissions').service('jwt');
const user = strapi.plugin('users-permissions').service('user');
const role = strapi.plugin('users-permissions').service('role');
export type UsersPermissions = [
  Core.Assert<Equal<typeof jwt, unknown>>,
  Core.Assert<Equal<typeof user, unknown>>,
  Core.Assert<Equal<typeof role, unknown>>,
];
// An explicit type argument types the lookup until the contract lands.
strapi
  .plugin('users-permissions')
  .service<{ issue(payload: object): string }>('jwt')
  .issue({ id: 1 }) satisfies string;

// Intended `unknown`: a third-party plugin and a local plugin (`src/plugins/*`) without declared
// contracts. Type generation registers `src/api` modules only.
const thirdParty = strapi.plugin('strapi-plugin-seo').service('seo');
const local = strapi.plugin('my-local-plugin').service('greeter');
export type PluginsWithoutContracts = [
  Core.Assert<Equal<typeof thirdParty, unknown>>,
  Core.Assert<Equal<typeof local, unknown>>,
];

// An application permission action: the `as const` list an application passes to `registerMany`,
// its declared ID, and the ID in the typed config of `admin::hasPermissions`. The IDs bundled
// packages declare close the inventory, so an ID the application does not declare is rejected.
export const reportActions = [
  { section: 'plugins', displayName: 'Export reports', uid: 'report.export' },
] as const;
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      // An interface merges into the registry: a type alias cannot.
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface PermissionActions extends Core.PermissionActionsOf<typeof reportActions> {}
    }
  }
}
const reportRouteConfig = {
  policies: [
    { name: 'admin::hasPermissions', config: { actions: ['plugin::upload.read'] } },
    { name: 'admin::hasPermissions', config: { actions: ['api::report.export'] } },
    {
      name: 'admin::hasPermissions',
      // @ts-expect-error A typo is not a declared ID.
      config: { actions: ['api::report.exprot'] },
    },
  ],
} satisfies Core.RouteConfigFor;
reportRouteConfig satisfies unknown;
