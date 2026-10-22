// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core } from '@strapi/types';
import type { Folder, UploadableFile } from '../types';
import type { Controllers } from './controllers';
import type { AIMetadataJobRow, FolderStructureNode } from './services';

declare const file: UploadableFile;
declare const context: Parameters<Core.ControllerHandler>[0];
declare const next: Parameters<Core.ControllerHandler>[1];

const metrics = strapi.plugin('upload').service('metrics');
metrics.trackUsage('didUploadImage') satisfies Promise<boolean>;
metrics.trackUsage('didBulkMoveMediaLibraryElements', {
  eventProperties: { totalFolderNumber: 1, rootAssetNumber: 2 },
});
// @ts-expect-error An event is named.
metrics.trackUsage({ eventProperties: {} });
// @ts-expect-error Event properties are an object.
metrics.trackUsage('didUploadImage', 'properties');
declare const properties: NonNullable<Parameters<typeof metrics.trackUsage>[1]>;
// @ts-expect-error Event property values are not typed by the service.
properties.eventProperties.rootAssetNumber satisfies unknown;
metrics.sendUploadPluginMetrics() satisfies Promise<void>;
// @ts-expect-error Registered services have no arbitrary members.
metrics.missing();

const imageManipulation = strapi.service('plugin::upload.image-manipulation');
imageManipulation.generateFileName('cover.png') satisfies string;
imageManipulation.getDimensions(file) satisfies Promise<{
  width: number | null;
  height: number | null;
}>;
imageManipulation.generateThumbnail(file) satisfies Promise<UploadableFile | null>;
// @ts-expect-error Registered services have no arbitrary members.
imageManipulation.missing();

const provider = strapi.plugin('upload').service('provider');
provider.upload(file) satisfies Promise<void>;
// @ts-expect-error Registered services have no arbitrary members.
provider.missing();

const weeklyMetrics = strapi.service('plugin::upload.weeklyMetrics');
weeklyMetrics.ensureWeeklyStoredCronSchedule() satisfies Promise<string>;
weeklyMetrics.computeMetrics() satisfies Promise<{
  assetNumber: number;
  folderNumber: number;
  averageDepth: number;
  maxDepth: number;
  averageDeviationDepth: number;
}>;
// @ts-expect-error Registered services have no arbitrary members.
weeklyMetrics.missing();

strapi
  .plugin('upload')
  .service('extensions')
  .signFileUrlsOnDocumentService() satisfies Promise<void>;

const aiMetadataJobs = strapi.plugin('upload').service('aiMetadataJobs');
aiMetadataJobs.createJob() satisfies Promise<number>;
aiMetadataJobs.getJob(1) satisfies Promise<AIMetadataJobRow | null>;
aiMetadataJobs.updateJob(1, {
  status: 'completed',
  completedAt: new Date(),
}) satisfies Promise<void>;
// @ts-expect-error A job is looked up by its numeric ID.
aiMetadataJobs.getJob('1');
declare const job: NonNullable<Awaited<ReturnType<typeof aiMetadataJobs.getLatestActiveJob>>>;
job.createdAt satisfies string;
job.completedAt satisfies string | null;
// @ts-expect-error Dates are read back as ISO strings.
job.createdAt satisfies Date;
// @ts-expect-error The status is one of the job states.
job.status satisfies 'pending';
// @ts-expect-error Registered services have no arbitrary members.
aiMetadataJobs.missing();

const aiMetadata = strapi.service('plugin::upload.aiMetadata');
aiMetadata.isEnabled() satisfies Promise<boolean>;
aiMetadata.countImagesWithoutMetadata() satisfies Promise<{
  imagesWithoutMetadataCount: number;
  totalImages: number;
}>;
aiMetadata.processExistingFiles(1, { id: 1 }) satisfies Promise<void>;
// @ts-expect-error Registered services have no arbitrary members.
aiMetadata.missing();

const aiMetadataProvider = strapi.plugin('upload').service('aiMetadataProvider');
aiMetadataProvider.hasProvider() satisfies boolean;
aiMetadataProvider.registerProvider({
  provider: { name: 'custom', generateMetadata: async () => ({ results: [] }) },
});
// @ts-expect-error A provider generates the metadata.
aiMetadataProvider.registerProvider({ provider: { name: 'custom' } });
// @ts-expect-error Registered services have no arbitrary members.
aiMetadataProvider.missing();

const folder = strapi.plugin('upload').service('folder');
folder.create({ name: 'Images', parent: null }, { user: { id: 1 } }) satisfies Promise<Folder>;
folder.update('1', { parent: null }, { user: { id: 1 } }) satisfies Promise<Folder | undefined>;
// @ts-expect-error The user is passed.
folder.update(1, { name: 'Images' });
folder.setPathIdAndPath({ name: 'Images' }) satisfies Promise<{
  name: string;
  pathId: number;
  path: string;
}>;
folder.deleteByIds([1]) satisfies Promise<{
  folders: Folder[];
  totalFolderNumber: number;
  totalFileNumber: number;
}>;
folder.exists({ name: 'Images', parent: null }) satisfies Promise<boolean>;
declare const structure: Awaited<ReturnType<typeof folder.getStructure>>;
structure satisfies FolderStructureNode[];
// @ts-expect-error The structure holds folders, not IDs.
structure satisfies number[];
// @ts-expect-error Registered services have no arbitrary members.
folder.missing();

strapi.service('plugin::upload.api-upload-folder').getAPIUploadFolder() satisfies Promise<Folder>;

const fileService = strapi.plugin('upload').service('file');
fileService.getFolderPath(null) satisfies Promise<string>;
// @ts-expect-error A folder is looked up by its numeric ID.
fileService.getFolderPath('1');
// @ts-expect-error Registered services have no arbitrary members.
fileService.missing();

const uploadService = strapi.plugin('upload').service('upload');
uploadService.getSettings() satisfies Promise<{
  sizeOptimization: boolean;
  responsiveDimensions: boolean;
  autoOrientation?: boolean | undefined;
  aiMetadata?: boolean | undefined;
} | null>;
declare const settings: NonNullable<Awaited<ReturnType<typeof uploadService.getSettings>>>;
// @ts-expect-error Settings saved without `aiMetadata` are stored without it.
settings.aiMetadata satisfies boolean;
uploadService.setSettings({
  sizeOptimization: true,
  responsiveDimensions: false,
}) satisfies Promise<void>;
// @ts-expect-error The settings are replaced as a whole.
uploadService.setSettings({ responsiveDimensions: false });
declare const configuration: NonNullable<
  Awaited<ReturnType<typeof uploadService.getConfiguration>>
>;
configuration.pageSize satisfies number;
configuration.sort satisfies string | undefined;
// @ts-expect-error The sort is a string.
configuration.sort satisfies number;
uploadService.setConfiguration({ pageSize: 10 }) satisfies Promise<void>;
// @ts-expect-error The page size is stored.
uploadService.setConfiguration({ sort: 'createdAt:DESC' });

strapi.controller('plugin::upload.admin-file').find(context, next);
strapi.plugin('upload').controller('admin-file').generateAIMetadata(context, next);
// @ts-expect-error Registered controllers have no arbitrary actions.
strapi.plugin('upload').controller('admin-file').missing(context, next);
strapi.controller('plugin::upload.admin-upload').uploadFromUrls(context, next);
strapi.plugin('upload').controller('admin-upload').upload(context, next);
// @ts-expect-error Registered controllers have no arbitrary actions.
strapi.controller('plugin::upload.admin-upload').missing(context, next);

[
  { method: 'GET', path: '/files', handler: 'admin-file.find' },
  { method: 'POST', path: '/', handler: 'admin-upload.upload' },
] satisfies Core.RouteInputFor<Controllers, 'plugin::upload'>[];
[
  // @ts-expect-error Route actions are checked against the controller contracts.
  { method: 'POST', path: '/files', handler: 'admin-upload.uploadFrom' },
] satisfies Core.RouteInputFor<Controllers, 'plugin::upload'>[];
