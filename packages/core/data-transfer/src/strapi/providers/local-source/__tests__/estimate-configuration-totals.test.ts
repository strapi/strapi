import type { Core } from '@strapi/types';

import { estimateConfigurationTotals } from '../estimate-configuration-totals';

describe('estimateConfigurationTotals', () => {
  test('sums core-store and webhook counts', async () => {
    const strapi = {
      db: {
        query: jest.fn((uid: string) => {
          if (uid === 'strapi::core-store') {
            return { count: jest.fn().mockResolvedValue(4) };
          }
          if (uid === 'strapi::webhook') {
            return { count: jest.fn().mockResolvedValue(2) };
          }
          return { count: jest.fn().mockResolvedValue(0) };
        }),
      },
    } as unknown as Core.Strapi;

    await expect(estimateConfigurationTotals(strapi)).resolves.toEqual({ totalCount: 6 });
  });

  test('ignores failures from one store', async () => {
    const strapi = {
      db: {
        query: jest.fn((uid: string) => {
          if (uid === 'strapi::core-store') {
            return { count: jest.fn().mockRejectedValue(new Error('no')) };
          }
          if (uid === 'strapi::webhook') {
            return { count: jest.fn().mockResolvedValue(3) };
          }
          return { count: jest.fn().mockResolvedValue(0) };
        }),
      },
    } as unknown as Core.Strapi;

    await expect(estimateConfigurationTotals(strapi)).resolves.toEqual({ totalCount: 3 });
  });
});
