import type { Core } from '@strapi/strapi';
import type {} from '@strapi/upload/strapi-server';

declare const app: Core.Strapi;

// Loading the Upload contracts does not opt applications into strictness: lookups keep develop's
// permissive service types.
const metrics = app.plugin('upload').service('metrics');
metrics.trackUsage('didUploadImage', 'properties').anything();
app.service('plugin::upload.image-manipulation').missing();
app.plugin('upload').service('weeklyMetrics').ensureWeeklyStoredCronSchedule(1).anything();
app.plugin('upload').service('aiMetadataJobs').getJob('1').anything();
