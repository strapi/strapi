import type { Core } from '@strapi/strapi';
import type {} from '@strapi/review-workflows/strapi-server';

declare const app: Core.Strapi;

// Loading the Review Workflows contracts does not opt applications into strictness: lookups keep
// develop's permissive service and controller types, which are never `undefined`.
app.plugin('review-workflows').service('validation').validateWorkflowStages('Draft').anything();
app.service('plugin::review-workflows.document-service-middlewares').missing();
app
  .plugin('review-workflows')
  .controller('stages')
  .unknownAction?.({} as never, async () => {});
app.controller('plugin::review-workflows.workflows').unknownAction?.({} as never, async () => {});
({
  type: 'admin',
  routes: [{ method: 'GET', path: '/workflows', handler: 'workflows.findAll' }],
}) satisfies Core.RouterInput;
