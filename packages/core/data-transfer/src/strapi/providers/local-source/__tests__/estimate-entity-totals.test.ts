import type { Core } from '@strapi/types';

import { estimateEntityTotals } from '../estimate-entity-totals';

describe('estimateEntityTotals', () => {
  test('sums db counts for each content type', async () => {
    const strapi = {
      contentTypes: {
        'api::a.a': { uid: 'api::a.a' },
        'api::b.b': { uid: 'api::b.b' },
      },
      db: {
        query: jest.fn((uid: string) => {
          if (uid === 'api::a.a') {
            return { count: jest.fn().mockResolvedValue(3) };
          }
          if (uid === 'api::b.b') {
            return { count: jest.fn().mockResolvedValue(5) };
          }
          return { count: jest.fn().mockResolvedValue(0) };
        }),
      },
    } as unknown as Core.Strapi;

    await expect(estimateEntityTotals(strapi)).resolves.toEqual({ totalCount: 8 });
  });

  test('skips content types whose count throws', async () => {
    const strapi = {
      contentTypes: {
        'api::ok.ok': { uid: 'api::ok.ok' },
        'api::bad.bad': { uid: 'api::bad.bad' },
      },
      db: {
        query: jest.fn((uid: string) => {
          if (uid === 'api::ok.ok') {
            return { count: jest.fn().mockResolvedValue(2) };
          }
          return { count: jest.fn().mockRejectedValue(new Error('no table')) };
        }),
      },
    } as unknown as Core.Strapi;

    await expect(estimateEntityTotals(strapi)).resolves.toEqual({ totalCount: 2 });
  });
});
