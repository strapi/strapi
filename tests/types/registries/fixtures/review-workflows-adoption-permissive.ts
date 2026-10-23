import type { Core } from '@strapi/strapi';
import type {} from '@strapi/review-workflows/strapi-server';

declare const app: Core.Strapi;

// Loading the Review Workflows contracts does not opt applications into strictness: lookups keep
// develop's permissive controller types, which are never `undefined`.
app
  .plugin('review-workflows')
  .controller('stages')
  .unknownAction?.({} as never, async () => {});
app.controller('plugin::review-workflows.workflows').unknownAction?.({} as never, async () => {});
({
  type: 'admin',
  routes: [{ method: 'GET', path: '/workflows', handler: 'workflows.findAll' }],
}) satisfies Core.RouterInput;
