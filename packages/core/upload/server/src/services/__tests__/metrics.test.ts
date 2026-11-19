import metricsService from '../weekly-metrics';
import trackUsageService from '../metrics';

describe('metrics', () => {
  describe('computeMetrics', () => {
    test.each([
      [[], 0, [0, 0, 0, 0, 0]],
      [
        [
          [1, 1],
          [2, 1],
          [3, 1],
          [4, 1],
        ],
        1,
        [1, 4, 2.5, 4, 1],
      ],
      [
        [
          [1, 1],
          [2, 1],
          [3, 100],
        ],
        4,
        [4, 3, 2.971, 102, 0.058],
      ],
    ])('folders: %s, assets: %s => %s', async (folderLevels, assetsNumber, expectedResults) => {
      const count = jest.fn(() => Promise.resolve(assetsNumber));
      const raw = jest.fn(() => '');
      const strapi = {
        getModel() {
          return {
            collectionName: () => 'upload_folders',
          };
        },
        db: {
          query() {
            return { count };
          },
          metadata: {
            get: () => ({ attributes: { path: { columnName: 'path' } } }),
          },
          getConnection() {
            return {
              select() {
                return {
                  groupBy: () =>
                    folderLevels.map((info) => ({ depth: info[0], occurence: info[1] })),
                };
              },
            };
          },
        },
        plugin() {
          return {
            service() {
              return {
                getSettings: () => Promise.resolve({ aiMetadata: false }),
              };
            },
          };
        },
      } as any;
      strapi.db.connection = { raw };

      const { computeMetrics } = metricsService({ strapi });

      const results = await computeMetrics();
      const [assetNumber, maxDepth, averageDepth, folderNumber, averageDeviationDepth] =
        expectedResults;

      expect(raw).toHaveBeenCalledWith(
        'LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(??, ?, ?), ?, ?), ?, ?), ?, ?), ?, ?), ?, ?), ?, ?), ?, ?), ?, ?), ?, ?)) AS depth, COUNT(*) AS occurence',
        [
          'path',
          '0',
          '',
          '1',
          '',
          '2',
          '',
          '3',
          '',
          '4',
          '',
          '5',
          '',
          '6',
          '',
          '7',
          '',
          '8',
          '',
          '9',
          '',
        ]
      );
      expect(results).toMatchObject({
        assetNumber,
        folderNumber,
        averageDepth: expect.closeTo(averageDepth, 3),
        maxDepth,
        averageDeviationDepth: expect.closeTo(averageDeviationDepth, 3),
      });
    });
  });
});

const createTrackUsageStrapi = ({ hasProvider }: { hasProvider: boolean }) => {
  const send = jest.fn(() => Promise.resolve(true));
  // `getService` reads the global `strapi`; the unit setup resolves `plugin(…).service(…)` from it.
  const strapi = {
    telemetry: { send },
    plugins: {
      upload: {
        services: {
          aiMetadataProvider: { hasProvider: () => hasProvider },
          aiMetadata: { isEnabled: () => Promise.resolve(true) },
        },
      },
    },
  } as any;

  return { strapi, send };
};

describe('metrics service', () => {
  describe('trackUsage', () => {
    test('merges isAiMediaLibraryConfigured into the eventProperties the caller passes', async () => {
      const { strapi, send } = createTrackUsageStrapi({ hasProvider: true });
      global.strapi = strapi;

      await trackUsageService({ strapi }).trackUsage('didBulkMoveMediaLibraryElements', {
        eventProperties: { rootFolderNumber: 1, rootAssetNumber: 2 },
        groupProperties: { uploadProvider: 'local' },
      });

      expect(send).toHaveBeenCalledWith('didBulkMoveMediaLibraryElements', {
        eventProperties: {
          rootFolderNumber: 1,
          rootAssetNumber: 2,
          isAiMediaLibraryConfigured: true,
        },
        groupProperties: { uploadProvider: 'local' },
      });
    });

    test('keeps the eventProperties as passed without an AI provider', async () => {
      const { strapi, send } = createTrackUsageStrapi({ hasProvider: false });
      global.strapi = strapi;

      await trackUsageService({ strapi }).trackUsage('didUploadImage');

      expect(send).toHaveBeenCalledWith('didUploadImage', { eventProperties: {} });
    });
  });
});
