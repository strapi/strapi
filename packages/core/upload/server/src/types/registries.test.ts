// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { UploadableFile } from '../types';

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
