import type { Core } from '@strapi/strapi';
import type {
  AIMetadataJobRow,
  AIMetadataJobsService,
  FilesQuery,
  Folder,
  FolderService,
  FolderStructureNode,
  MetricsService,
  UploadService,
} from '@strapi/upload/strapi-server';

declare const app: Core.Strapi;
declare const context: Parameters<Core.ControllerHandler>[0];
declare const next: Parameters<Core.ControllerHandler>[1];

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

const uploadService = app.plugin('upload').service('upload');
uploadService satisfies UploadService;
const settings = uploadService.getSettings();
settings satisfies Promise<{
  sizeOptimization: boolean;
  responsiveDimensions: boolean;
  autoOrientation?: boolean | undefined;
  aiMetadata?: boolean | undefined;
} | null>;
const configuration = app.service('plugin::upload.upload').getConfiguration();
configuration satisfies Promise<{ pageSize: number; sort?: string | undefined } | null>;
// @ts-expect-error The sort is a string.
app.service('plugin::upload.upload').setConfiguration({ pageSize: 10, sort: 1 });
const filesQuery = {
  filters: { name: { $containsi: 'cover' } },
  pagination: { page: 1, pageSize: 10 },
} satisfies FilesQuery;
uploadService.findAndCountPage(filesQuery);
app.service('plugin::upload.upload').findMany({ sort: 'name:asc', start: 0, limit: 10 });
app.plugin('upload').service('upload').findOne(1, ['folder']);
// @ts-expect-error `findPage` pages from flat `page` and `pageSize`.
app.service('plugin::upload.upload').findPage({ pagination: { page: 1 } });

app.plugin('upload').controller('admin-file').findOne(context, next);
app.controller('plugin::upload.admin-upload').bulkUpdateFileInfo(context, next);
// @ts-expect-error Registry controller actions do not accept misspelled names.
app.plugin('upload').controller('admin-upload').uploadFromUrl(context, next);
app.plugin('upload').controller('admin-folder').create(context, next);
app.controller('plugin::upload.admin-folder-file').deleteMany(context, next);
app.plugin('upload').controller('admin-settings').getSettings(context, next);
// @ts-expect-error Registry controller actions do not accept misspelled names.
app.controller('plugin::upload.admin-folder').getStructures(context, next);
app.plugin('upload').controller('content-api').findPage(context, next);
app.controller('plugin::upload.view-configuration').findViewConfiguration(context, next);
// @ts-expect-error Registry controller actions do not accept misspelled names.
app.controller('plugin::upload.content-api').uploadFile(context, next);

type Controllers = {
  'admin-file': Strapi.Registries.PackageControllers['plugin::upload.admin-file'];
  'admin-folder': Strapi.Registries.PackageControllers['plugin::upload.admin-folder'];
  'admin-folder-file': Strapi.Registries.PackageControllers['plugin::upload.admin-folder-file'];
  'admin-settings': Strapi.Registries.PackageControllers['plugin::upload.admin-settings'];
  'admin-upload': Strapi.Registries.PackageControllers['plugin::upload.admin-upload'];
  'content-api': Strapi.Registries.PackageControllers['plugin::upload.content-api'];
  'view-configuration': Strapi.Registries.PackageControllers['plugin::upload.view-configuration'];
};
[
  { method: 'DELETE', path: '/files/:id', handler: 'admin-file.destroy' },
  { method: 'GET', path: '/folders/:id', handler: 'admin-folder.findOne' },
  { method: 'POST', path: '/actions/bulk-delete', handler: 'admin-folder-file.deleteMany' },
  { method: 'GET', path: '/settings', handler: 'admin-settings.getSettings' },
  { method: 'DELETE', path: '/files/:id', handler: 'content-api.destroy' },
  { method: 'GET', path: '/configuration', handler: 'view-configuration.findViewConfiguration' },
] satisfies Core.RouteInputFor<Controllers, 'plugin::upload'>[];
[
  // @ts-expect-error Route actions are checked against the controller contracts.
  { method: 'DELETE', path: '/files/:id', handler: 'admin-file.delete' },
] satisfies Core.RouteInputFor<Controllers, 'plugin::upload'>[];
[
  // @ts-expect-error Route actions are checked against the controller contracts.
  { method: 'PUT', path: '/settings', handler: 'admin-settings.setSettings' },
] satisfies Core.RouteInputFor<Controllers, 'plugin::upload'>[];
[
  // @ts-expect-error Route actions are checked against the controller contracts.
  { method: 'GET', path: '/configuration', handler: 'view-configuration.getViewConfiguration' },
] satisfies Core.RouteInputFor<Controllers, 'plugin::upload'>[];
