import type { Core } from '@strapi/types';

import { getFolderService } from '../folder-service';

/**
 * `getFolderService` exists to stop a handler from *looking* instance-bound while the folder
 * service silently queries `global.strapi` — see the module for why the service is not converted
 * to a factory here. These tests pin both halves of that contract.
 */
describe('getFolderService', () => {
  const folderService = { getStructure: jest.fn(), exists: jest.fn() };

  const setGlobalStrapi = () => {
    const instance = {
      plugins: { upload: { services: { folder: folderService } } },
    };

    (global as unknown as { strapi: unknown }).strapi = instance;

    return (global as unknown as { strapi: Core.Strapi }).strapi;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns the folder service when handed the ambient instance', () => {
    const strapi = setGlobalStrapi();

    expect(getFolderService(strapi)).toBe(folderService);
  });

  test('throws rather than querying the wrong app when handed a different instance', () => {
    setGlobalStrapi();

    // A second instance carrying its own folder service: the failure mode is that the returned
    // service would still read the ambient app's media library, not this one's.
    const other = {
      plugin: () => ({ service: () => ({ getStructure: jest.fn() }) }),
    } as unknown as Core.Strapi;

    expect(() => getFolderService(other)).toThrow(/bound to the ambient/i);
  });
});
