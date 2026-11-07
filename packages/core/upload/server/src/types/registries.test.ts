// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core } from '@strapi/types';
import type { File, Folder, UploadableFile, UploadInputFile } from '../types';
import type { Controllers } from './controllers';
import type { AIMetadataJobRow, FileFormat, FolderStructureNode } from './services';

declare const file: UploadableFile;
declare const fileRow: File;
declare const fileFormat: FileFormat;
declare const inputFile: UploadInputFile;
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
provider.replace(file, fileRow) satisfies Promise<void>;
provider.replace(file, fileFormat) satisfies Promise<void>;
// @ts-expect-error The old file is a file row or one of its formats.
provider.replace(file, { name: 'cover.png' });
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
fileService.deleteByIds([1]) satisfies Promise<File[]>;
// @ts-expect-error The deleted files are file rows.
fileService.deleteByIds([1]) satisfies Promise<number[]>;
fileService.signFileUrls(fileRow) satisfies Promise<File>;
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
uploadService.findMany();
uploadService.findMany({
  filters: { mime: { $contains: 'image' } },
  sort: ['name:asc'],
  populate: { related: true },
  fields: ['name', 'url'],
  pagination: { page: '1', pageSize: '10' },
});
// @ts-expect-error A query is an object.
uploadService.findMany('name:asc');
uploadService.findPage({ _q: 'cover', page: '1', pageSize: '10', populate: { folder: true } });
// @ts-expect-error `findPage` pages from flat `page` and `pageSize`.
uploadService.findPage({ pagination: { page: 1 } });
uploadService.findAndCountPage({ pagination: { start: '0', limit: '10', withCount: 'false' } });
uploadService.findAndCountPage({ pagination: { page: 2, withCount: false } });
// @ts-expect-error Pagination values are numbers or strings.
uploadService.findAndCountPage({ pagination: { page: true } });
uploadService.findOne(1, ['createdBy', 'folder']);
uploadService.findOne('1', '*');
uploadService.findOne(1, { related: { on: { 'api::writer.writer': true } } });
// @ts-expect-error Populate is a field list or a populate object.
uploadService.findOne(1, 1);
uploadService.upload({ data: {}, files: [inputFile] }) satisfies Promise<File[]>;
declare const uploaded: Awaited<ReturnType<typeof uploadService.upload>>;
// @ts-expect-error File rows have no arbitrary keys.
uploaded[0]?.missing satisfies unknown;
uploadService.replace(1, { data: { fileInfo: {} }, file: inputFile }) satisfies Promise<File>;
uploadService.updateFileInfo(1, { name: 'cover.png' }, { user: { id: 1 } }) satisfies Promise<File>;
// @ts-expect-error The file info is an object.
uploadService.updateFileInfo(1, 'cover.png');
uploadService.findOne(1) satisfies Promise<File | null>;
// @ts-expect-error No file may have this ID.
uploadService.findOne(1) satisfies Promise<File>;
uploadService.findMany() satisfies Promise<File[]>;
declare const page: Awaited<ReturnType<typeof uploadService.findPage>>;
page.results satisfies File[];
page.pagination.pageCount satisfies number;
// @ts-expect-error A page holds file rows.
page.results satisfies number[];
declare const countedPage: Awaited<ReturnType<typeof uploadService.findAndCountPage>>;
countedPage.results satisfies File[];
// @ts-expect-error A page holds file rows.
countedPage.results satisfies number[];
uploadService.remove(fileRow) satisfies Promise<File | null>;
// @ts-expect-error The row may already be deleted.
uploadService.remove(fileRow) satisfies Promise<File>;

strapi.controller('plugin::upload.admin-file').find(context, next);
strapi.plugin('upload').controller('admin-file').generateAIMetadata(context, next);
// @ts-expect-error Registered controllers have no arbitrary actions.
strapi.plugin('upload').controller('admin-file').missing(context, next);
strapi.controller('plugin::upload.admin-upload').uploadFromUrls(context, next);
strapi.plugin('upload').controller('admin-upload').upload(context, next);
// @ts-expect-error Registered controllers have no arbitrary actions.
strapi.controller('plugin::upload.admin-upload').missing(context, next);
strapi.controller('plugin::upload.admin-folder').getStructure(context, next);
strapi.plugin('upload').controller('admin-folder').update(context, next);
// @ts-expect-error Registered controllers have no arbitrary actions.
strapi.plugin('upload').controller('admin-folder').delete(context, next);
strapi.controller('plugin::upload.admin-folder-file').moveMany(context, next);
strapi.plugin('upload').controller('admin-folder-file').deleteMany(context, next);
strapi.controller('plugin::upload.admin-settings').getSettings(context, next);
strapi.plugin('upload').controller('admin-settings').updateSettings(context, next);
// @ts-expect-error Registered controllers have no arbitrary actions.
strapi.controller('plugin::upload.admin-settings').setSettings(context, next);
strapi.controller('plugin::upload.content-api').findPage(context, next);
strapi.plugin('upload').controller('content-api').upload(context, next);
strapi.plugin('upload').controller('content-api').updateFileInfo(context, next);
// @ts-expect-error Registered controllers have no arbitrary actions.
strapi.plugin('upload').controller('content-api').findMany(context, next);
strapi.controller('plugin::upload.view-configuration').findViewConfiguration(context, next);
strapi.plugin('upload').controller('view-configuration').updateViewConfiguration(context, next);
// @ts-expect-error Registered controllers have no arbitrary actions.
strapi.controller('plugin::upload.view-configuration').getViewConfiguration(context, next);

declare const contentApi: Core.ControllerFactory<'plugin::upload.content-api'>;
contentApi({ strapi }).destroy(context, next);
declare const handler: Core.ControllerHandler;
// @ts-expect-error A content API controller factory returns every action.
(() => ({ find: handler })) satisfies Core.ControllerFactory<'plugin::upload.content-api'>;

[
  { method: 'GET', path: '/files', handler: 'admin-file.find' },
  { method: 'POST', path: '/', handler: 'admin-upload.upload' },
  { method: 'GET', path: '/folder-structure', handler: 'admin-folder.getStructure' },
  { method: 'POST', path: '/actions/bulk-move', handler: 'admin-folder-file.moveMany' },
  { method: 'PUT', path: '/settings', handler: 'admin-settings.updateSettings' },
  { method: 'GET', path: '/files/page', handler: 'content-api.findPage' },
  { method: 'PUT', path: '/configuration', handler: 'view-configuration.updateViewConfiguration' },
] satisfies Core.RouteInputFor<Controllers, 'plugin::upload'>[];
[
  // @ts-expect-error Route actions are checked against the controller contracts.
  { method: 'POST', path: '/files', handler: 'admin-upload.uploadFrom' },
] satisfies Core.RouteInputFor<Controllers, 'plugin::upload'>[];
[
  // @ts-expect-error Route actions are checked against the controller contracts.
  { method: 'GET', path: '/folders', handler: 'admin-folder.findMany' },
] satisfies Core.RouteInputFor<Controllers, 'plugin::upload'>[];
[
  // @ts-expect-error Route actions are checked against the controller contracts.
  { method: 'GET', path: '/files', handler: 'content-api.findMany' },
] satisfies Core.RouteInputFor<Controllers, 'plugin::upload'>[];

// Upload declares its content-type schemas: the Document Service reads them without type generation.
const uploadedFile = await strapi
  .documents('plugin::upload.file')
  .findFirst({ populate: ['folder'] });
if (uploadedFile !== null) {
  uploadedFile.name satisfies string | null;
  uploadedFile.folder satisfies { path?: string | null } | null;
  uploadedFile.createdAt satisfies string | null;
  // @ts-expect-error Not an attribute of plugin::upload.file.
  uploadedFile.missing satisfies unknown;
}
// @ts-expect-error Filters are checked against the declared schema.
strapi.documents('plugin::upload.folder').findMany({ filters: { missing: { $eq: 1 } } });
// Content types no package declares stay generic.
strapi.documents('api::article.article').findMany({ filters: { anything: { $eq: 1 } } });
