import type { Core } from '@strapi/strapi';
import type { OverrideService } from '@strapi/plugin-documentation/strapi-server';

declare const app: Core.Strapi;
declare const context: Parameters<Core.ControllerHandler>[0];
declare const next: Parameters<Core.ControllerHandler>[1];

const override = app.plugin('documentation').service('override');
override satisfies OverrideService;
// Plugins register their OpenAPI parts as objects or as YAML text.
const registered = override.registerOverride('openapi: 3.0.0', {
  pluginOrigin: 'users-permissions',
  excludeFromGeneration: ['users-permissions'],
});
registered satisfies void;
app
  .service('plugin::documentation.override')
  .registerOverride({ paths: {} }, { excludeFromGeneration: ['homepage'] });
// @ts-expect-error An override is an OpenAPI part or its text.
override.registerOverride(['openapi: 3.0.0']);
override.excludeFromGeneration('upload');
// @ts-expect-error Registered services have no arbitrary members.
override.missing();

const documentation = app.plugin('documentation').service('documentation');
const generated = documentation.generateFullDoc();
generated satisfies Promise<void>;
// @ts-expect-error Registered services have no arbitrary members.
app.service('plugin::documentation.documentation').missing();

app.plugin('documentation').controller('documentation').getInfos(context, next);
app.controller('plugin::documentation.documentation').updateSettings(context, next);
// @ts-expect-error Registry controller actions do not accept misspelled names.
app.plugin('documentation').controller('documentation').getInfo(context, next);

type Controllers = {
  documentation: Strapi.Registries.PackageControllers['plugin::documentation.documentation'];
};
[
  { method: 'POST', path: '/regenerateDoc', handler: 'documentation.regenerateDoc' },
] satisfies Core.RouteInputFor<Controllers, 'plugin::documentation'>[];
[
  // @ts-expect-error Route actions are checked against the controller contracts.
  { method: 'POST', path: '/regenerateDoc', handler: 'documentation.regenerateDocs' },
] satisfies Core.RouteInputFor<Controllers, 'plugin::documentation'>[];
