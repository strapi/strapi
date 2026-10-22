import type { Core } from '@strapi/strapi';
import type { OverrideService } from '@strapi/plugin-documentation/strapi-server';

declare const app: Core.Strapi;

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
