import type { Core } from '@strapi/strapi';
import type { MetricsService } from '@strapi/upload/strapi-server';

declare const app: Core.Strapi;

const metrics = app.plugin('upload').service('metrics');
metrics satisfies MetricsService;
const tracked = metrics.trackUsage('didUploadImage', { eventProperties: { totalAssetNumber: 1 } });
tracked satisfies Promise<boolean>;
// @ts-expect-error Event properties are an object.
app.service('plugin::upload.metrics').trackUsage('didUploadImage', 'properties');
// @ts-expect-error Registered services have no arbitrary members.
metrics.missing();

const fileName = app.service('plugin::upload.image-manipulation').generateFileName('cover.png');
fileName satisfies string;
const schedule = app.plugin('upload').service('weeklyMetrics').ensureWeeklyStoredCronSchedule();
schedule satisfies Promise<string>;
// @ts-expect-error Registered services have no arbitrary members.
app.plugin('upload').service('provider').missing();
