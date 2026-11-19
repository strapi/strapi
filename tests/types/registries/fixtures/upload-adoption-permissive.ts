import type { Core } from '@strapi/strapi';
import type {} from '@strapi/upload/strapi-server';

declare const app: Core.Strapi;

// Loading the Upload contracts does not opt applications into strictness: lookups keep develop's
// permissive service and controller types.
const metrics = app.plugin('upload').service('metrics');
metrics.trackUsage('didUploadImage', 'properties').anything();
app.service('plugin::upload.image-manipulation').missing();
app.plugin('upload').service('weeklyMetrics').ensureWeeklyStoredCronSchedule(1).anything();
app.plugin('upload').service('aiMetadataJobs').getJob('1').anything();
app.plugin('upload').service('folder').getStructure(1).anything();
app.service('plugin::upload.file').getFolderPath('1').anything();
app.plugin('upload').service('upload').getSettings(1).anything();
app.service('plugin::upload.upload').findPage({ pagination: true }).anything();
app.plugin('upload').service('upload').findOne(1).anything();
app.service('plugin::upload.provider').replace(1, 2).anything();
app
  .plugin('upload')
  .controller('admin-upload')
  .unknownAction?.({} as never, async () => {});
app.controller('plugin::upload.admin-folder').unknownAction?.({} as never, async () => {});
app.controller('plugin::upload.content-api').unknownAction?.({} as never, async () => {});
[{ method: 'GET', path: '/files', handler: 'admin-file.findAll' }] satisfies Core.RouteInput[];
