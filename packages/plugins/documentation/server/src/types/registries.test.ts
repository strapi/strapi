// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core } from '@strapi/types';
import type { Controllers } from './controllers';

declare const context: Parameters<Core.ControllerHandler>[0];
declare const next: Parameters<Core.ControllerHandler>[1];

const override = strapi.plugin('documentation').service('override');

// Plugins register their OpenAPI parts as objects or as YAML text.
override.registerOverride('openapi: 3.0.0', {
  pluginOrigin: 'users-permissions',
  excludeFromGeneration: ['users-permissions'],
}) satisfies void;
override.registerOverride({ info: { title: 'API', version: '2.0.0' }, paths: {} });
override.registerOverride({ tags: [] }, { excludeFromGeneration: ['homepage'] });
// @ts-expect-error An override is an OpenAPI part or its text.
override.registerOverride(['openapi: 3.0.0']);
// @ts-expect-error The plugin origin is a plugin name.
override.registerOverride({ tags: [] }, { pluginOrigin: true });

override.excludeFromGeneration(['upload', 'users-permissions']);
override.isEnabled('upload') satisfies boolean;
// @ts-expect-error Registered services have no arbitrary members.
override.missing();

const documentation = strapi.service('plugin::documentation.documentation');
documentation.generateFullDoc('1.0.0') satisfies Promise<void>;
documentation.getDocumentationVersions() satisfies Array<{
  version: string;
  generatedDate: string;
  url: string;
}>;
// @ts-expect-error Registered services have no arbitrary members.
documentation.missing();

strapi.controller('plugin::documentation.documentation').regenerateDoc(context, next);
strapi.plugin('documentation').controller('documentation').index(context, next);
// @ts-expect-error Registered controllers have no arbitrary actions.
strapi.plugin('documentation').controller('documentation').missing(context, next);

[
  {
    method: 'GET',
    path: '/',
    handler: 'documentation.index',
    config: { auth: false, middlewares: [async (_ctx, nextMiddleware) => nextMiddleware()] },
  },
  { method: 'DELETE', path: '/deleteDoc/:version', handler: 'documentation.deleteDoc' },
] satisfies Core.RouteInputFor<Controllers, 'plugin::documentation'>[];
[
  // @ts-expect-error Route actions are checked against the controller contracts.
  { method: 'POST', path: '/regenerateDoc', handler: 'documentation.regenerate' },
] satisfies Core.RouteInputFor<Controllers, 'plugin::documentation'>[];
