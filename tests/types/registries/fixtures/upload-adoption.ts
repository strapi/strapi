import type { Core } from '@strapi/strapi';
import type {
  AIMetadataJobRow,
  AIMetadataJobsService,
  Folder,
  FolderService,
  FolderStructureNode,
  MetricsService,
} from '@strapi/upload/strapi-server';

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

const jobs = app.plugin('upload').service('aiMetadataJobs');
jobs satisfies AIMetadataJobsService;
const latestJob = jobs.getLatestActiveJob();
latestJob satisfies Promise<AIMetadataJobRow | null>;
// @ts-expect-error A job is looked up by its numeric ID.
app.service('plugin::upload.aiMetadataJobs').getJob('1');
const hasProvider = app.plugin('upload').service('aiMetadataProvider').hasProvider();
hasProvider satisfies boolean;
// @ts-expect-error Registered services have no arbitrary members.
app.service('plugin::upload.aiMetadata').missing();

const folders = app.plugin('upload').service('folder');
folders satisfies FolderService;
const structure = folders.getStructure();
structure satisfies Promise<FolderStructureNode[]>;
// @ts-expect-error The structure holds folders, not IDs.
app.service('plugin::upload.folder').getStructure() satisfies Promise<number[]>;
const apiFolder = app.plugin('upload').service('api-upload-folder').getAPIUploadFolder();
apiFolder satisfies Promise<Folder>;
const folderPath = app.service('plugin::upload.file').getFolderPath(1);
folderPath satisfies Promise<string>;
