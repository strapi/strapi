'use strict';

const metricsService = require('../metrics');

// TODO: the matcher exists in jest@28
const closeTo = (expected, precision = 2) => ({
  asymmetricMatch: (actual) => Math.abs(expected - actual) < 10 ** -precision / 2,
});

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
        entityService: {
          count,
        },
        db: {
          metadata: {
            get: () => ({ attributes: { path: { columnName: 'path' } } }),
          },
          connection() {
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
      };
      strapi.db.connection.raw = raw;

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
        averageDepth: closeTo(averageDepth, 3),
        maxDepth,
        averageDeviationDepth: closeTo(averageDeviationDepth, 3),
      });
    });
  });
});
