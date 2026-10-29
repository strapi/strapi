import type { Core } from '@strapi/strapi';
import type {} from '@strapi/plugin-documentation/strapi-server';

declare const app: Core.Strapi;

// Loading the Documentation contracts does not opt applications into strictness: lookups keep
// develop's permissive service and controller types.
const override = app.plugin('documentation').service('override');
override.registerOverride(['openapi: 3.0.0'], { pluginOrigin: true }).anything();
app.service('plugin::documentation.documentation').missing();
app
  .plugin('documentation')
  .controller('documentation')
  .unknownAction?.({} as never, async () => {});
[
  { method: 'POST', path: '/regenerateDoc', handler: 'documentation.regenerateDocs' },
] satisfies Core.RouteInput[];
