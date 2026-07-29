import { Readable } from 'stream';

import {
  collect,
  createMockedQueryBuilder,
  getStrapiFactory,
} from '../../../../__tests__/test-utils';
import { createConfigurationStream } from '../configuration';

describe('Configuration', () => {
  test('Should return configuration from multiple data sources, wrapped in the same data format', async () => {
    const queryBuilder = createMockedQueryBuilder({
      'strapi::core-store': [
        // Values must be stringified JSON for the core-store
        { id: 1, key: 'foo', value: '{}' },
        { id: 2, key: 'bar', value: '{}' },
      ],
      'strapi::webhook': [
        { id: 1, url: '/foo', headers: {}, events: [], enabled: false },
        { id: 2, url: '/bar', headers: {}, events: [], enabled: true },
        { id: 3, url: '/foobar', headers: {}, events: [], enabled: true },
      ],
    });

    const strapi = getStrapiFactory({ db: { queryBuilder } })();

    const stream = createConfigurationStream(strapi);

    expect(stream).toBeInstanceOf(Readable);

    const results = await collect(stream);

    expect(results).toHaveLength(5);

    results.forEach((result) => {
      expect(result).toMatchObject(
        expect.objectContaining({
          type: expect.stringMatching(/^(core-store|webhook)$/),
          value: expect.any(Object),
        })
      );
    });
  });

  const contentStructureFile = {
    version: 1,
    sections: {
      collectionTypes: {
        groups: [
          {
            parent: null,
            name: 'Blog',
            id: 'grp_blog01',
            children: [{ type: 'contentType', uid: 'api::article.article' }],
          },
        ],
      },
      singleTypes: { groups: [] },
    },
  };

  test('Should emit content-structure groups.json as a configuration item when present', async () => {
    const queryBuilder = createMockedQueryBuilder({
      'strapi::core-store': [],
      'strapi::webhook': [],
    });
    const read = jest.fn(async () => contentStructureFile);
    const strapi = getStrapiFactory({
      db: { queryBuilder },
      get: jest.fn((token: string) => (token === 'content-structure' ? { read } : undefined)),
    })();

    const results = await collect(createConfigurationStream(strapi));

    expect(read).toHaveBeenCalledTimes(1);
    expect(results).toEqual([{ type: 'content-structure', value: contentStructureFile }]);
  });

  test('Should not emit a content-structure item when groups.json is absent', async () => {
    const queryBuilder = createMockedQueryBuilder({
      'strapi::core-store': [],
      'strapi::webhook': [],
    });
    const read = jest.fn(async () => null);
    const strapi = getStrapiFactory({
      db: { queryBuilder },
      get: jest.fn(() => ({ read })),
    })();

    const results = await collect(createConfigurationStream(strapi));

    expect(read).toHaveBeenCalledTimes(1);
    expect(results).toEqual([]);
  });
});
