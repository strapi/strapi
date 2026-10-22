// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { UploadableFile } from '../types';
import type { AIMetadataJobRow } from './services';

declare const file: UploadableFile;

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
