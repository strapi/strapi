import type { Core } from '@strapi/types';

import { estimateLinkTotals } from '../estimate-link-totals';

jest.mock('../../../queries/link', () => ({
  createLinkQuery: jest.fn(() => () => ({
    countAllForUid: jest.fn().mockImplementation(async (uid: string) => {
      if (uid === 'api::a.a') {
        return 10;
      }
      if (uid === 'default.foo') {
        return 5;
      }
      return 0;
    }),
  })),
}));

describe('estimateLinkTotals', () => {
  test('sums countAllForUid across content types and components', async () => {
    const strapi = {
      contentTypes: {
        'api::a.a': {},
      },
      components: {
        'default.foo': {},
      },
    } as unknown as Core.Strapi;

    await expect(estimateLinkTotals(strapi)).resolves.toEqual({ totalCount: 15 });
  });
});
