import type { Core } from '@strapi/types';

import { transformData } from '../data';
import { createIdMap } from '../id-map';

jest.mock('../id-map', () => ({
  createIdMap: jest.fn(),
}));

jest.mock('../relations/extract/data-ids', () => ({
  extractDataIds: jest.fn(async () => undefined),
}));

jest.mock('../relations/transform/data-ids', () => ({
  transformDataIdsVisitor: jest.fn(async (_idMap: any, data: any) => data),
}));

jest.mock('../relations/transform/default-locale', () => ({
  setDefaultLocaleToRelations: jest.fn(async (data: any) => data),
}));

describe('transformData request cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const requestState = {};

    global.strapi = {
      requestContext: {
        get: () => ({ state: requestState }),
      },
    } as unknown as Core.Strapi;

    (createIdMap as jest.Mock).mockReturnValue({
      load: jest.fn(async () => undefined),
    });
  });

  it('reuses the same idMap across calls within a request', async () => {
    await transformData({ foo: 'bar' }, { uid: 'api::test.test' });
    await transformData({ foo: 'baz' }, { uid: 'api::test.test' });

    expect(createIdMap).toHaveBeenCalledTimes(1);
  });
});
