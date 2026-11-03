import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Core } from '@strapi/types';

import { clearTransformDataRequestCache, transformData } from '../data';
import { createIdMap } from '../id-map';

vi.mock('../id-map', () => ({
  createIdMap: vi.fn(),
}));

vi.mock('../relations/extract/data-ids', () => ({
  extractDataIds: vi.fn(async () => undefined),
}));

vi.mock('../relations/transform/data-ids', () => ({
  transformDataIdsVisitor: vi.fn(async (_idMap: any, data: any) => data),
}));

vi.mock('../relations/transform/default-locale', () => ({
  setDefaultLocaleToRelations: vi.fn(async (data: any) => data),
}));

describe('transformData request cache', () => {
  let idMap: { clear: Mock; load: Mock };

  beforeEach(() => {
    vi.clearAllMocks();
    const requestState = {};

    global.strapi = {
      requestContext: {
        get: () => ({ state: requestState }),
      },
    } as unknown as Core.Strapi;

    idMap = {
      clear: vi.fn(),
      load: vi.fn(async () => undefined),
    };

    (createIdMap as Mock).mockReturnValue(idMap);
  });

  it('reuses the same idMap across calls within a request', async () => {
    await transformData({ foo: 'bar' }, { uid: 'api::test.test' });
    await transformData({ foo: 'baz' }, { uid: 'api::test.test' });

    expect(createIdMap).toHaveBeenCalledTimes(1);
  });

  it('bypasses the request cache when disabled', async () => {
    await transformData({ foo: 'bar' }, { uid: 'api::test.test', useRequestCache: false });
    await transformData({ foo: 'baz' }, { uid: 'api::test.test', useRequestCache: false });

    expect(createIdMap).toHaveBeenCalledTimes(2);
  });

  it('clears the request cache when invalidated', async () => {
    await transformData({ foo: 'bar' }, { uid: 'api::test.test' });

    clearTransformDataRequestCache();

    expect(idMap.clear).toHaveBeenCalledTimes(1);
  });
});
