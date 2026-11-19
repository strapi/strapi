// Strict-off parity: policies (lookups, maps, handlers, route `policies` config) as develop apps use them.
// Compiled against develop too, so every expected error below is one develop reports.
import type { Core } from '@strapi/strapi';

declare const strapi: Core.Strapi;
declare const factories: typeof import('@strapi/strapi').factories;

// Lookups and maps take any name.
const policy = strapi.policy('global::is-owner');
if (typeof policy === 'function') {
  policy({} as Core.PolicyContext, {}, { strapi });
} else {
  policy.handler({} as Core.PolicyContext, {}, { strapi });
}
strapi.policy('plugin::parity.hasRole');
strapi.policy('admin::isAuthenticatedAdmin');
const fromMap = strapi.policies['plugin::parity.hasRole'];

// Handlers with a config.
const hasRole: Core.PolicyHandler<{ role: string }> = (ctx, config) => config.role === 'admin';
const asPolicy: Core.Policy<{ role: string }> = hasRole;
strapi.policies['api::parity.hasRole'] = (() => true) as Core.Policy;

// Route configs accept any policy name and config.
const config: Core.RouteConfig = {
  policies: [
    'global::is-owner',
    'plugin::parity.hasRole',
    'is-owner',
    { name: 'plugin::parity.hasRole', config: { role: 'admin' } },
    { name: 'anything', config: undefined },
  ],
  middlewares: ['global::logger'],
  auth: false,
};
const route: Core.Route = {
  method: 'GET',
  path: '/parity',
  handler: 'example.find',
  info: {},
  config,
};
const routeInput: Core.RouteInput = {
  method: 'GET',
  path: '/parity',
  handler: 'api::parity.example.find',
  config: { policies: ['admin::isAuthenticatedAdmin'] },
};
const router: Core.RouterInput = {
  type: 'content-api',
  routes: [routeInput, { method: 'POST', path: '/x', handler: 'x.y', config: { policies: [] } }],
};
const badConfig: Core.RouteConfig = {
  // @ts-expect-error TS2322 a policy reference is a string or `{ name, config }`
  policies: [1],
};
const missingConfig: Core.RouteConfig = {
  // @ts-expect-error TS2741 `{ name }` needs `config`
  policies: [{ name: 'x' }],
};

// Core router factory configs.
factories.createCoreRouter('api::parity.parity', {
  config: {
    find: {
      policies: ['global::is-owner', { name: 'plugin::parity.hasRole', config: { role: 'a' } }],
    },
  },
});

export { policy, fromMap, hasRole, asPolicy, route, router, badConfig, missingConfig };
