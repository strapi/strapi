import type { Core, Modules } from '@strapi/types';
import { readContentStructureForExport, restoreContentStructure } from '../content-structure';

const asStrapi = (value: unknown) => value as Core.Strapi;

const groupsFile: Modules.ContentStructure.ContentStructureFile = {
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

describe('data-transfer content-structure config helper', () => {
  describe('readContentStructureForExport', () => {
    test('returns the parsed groups file from the core service', async () => {
      const read = jest.fn(async () => groupsFile);
      const strapi = asStrapi({ get: jest.fn(() => ({ read })) });

      await expect(readContentStructureForExport(strapi)).resolves.toBe(groupsFile);
      expect(read).toHaveBeenCalledTimes(1);
    });

    test('returns null when the file is absent', async () => {
      const read = jest.fn(async () => null);
      const strapi = asStrapi({ get: jest.fn(() => ({ read })) });

      await expect(readContentStructureForExport(strapi)).resolves.toBeNull();
    });

    test('returns null when the content-structure service is unavailable', async () => {
      const strapi = asStrapi({
        get: jest.fn(() => {
          throw new Error('Could not resolve service content-structure');
        }),
      });

      await expect(readContentStructureForExport(strapi)).resolves.toBeNull();
    });

    test('returns null when strapi.get is missing (e.g. a minimal instance)', async () => {
      const strapi = asStrapi({});

      await expect(readContentStructureForExport(strapi)).resolves.toBeNull();
    });
  });

  describe('restoreContentStructure', () => {
    test('validates then writes the groups file through the core service', async () => {
      const write = jest.fn(async () => {});
      const validate = jest.fn((value) => value);
      const strapi = asStrapi({ get: jest.fn(() => ({ validate, write })) });

      await restoreContentStructure(strapi, groupsFile);

      expect(validate).toHaveBeenCalledWith(groupsFile);
      expect(write).toHaveBeenCalledTimes(1);
      expect(write).toHaveBeenCalledWith(groupsFile);
    });

    test('rejects invalid data and does not write, leaving the previous file intact', async () => {
      const write = jest.fn(async () => {});
      const validate = jest.fn(() => {
        throw new Error('Unknown version "2"');
      });
      const strapi = asStrapi({ get: jest.fn(() => ({ validate, write })) });

      await expect(restoreContentStructure(strapi, { version: 2 })).rejects.toThrow(
        'Unknown version'
      );
      expect(write).not.toHaveBeenCalled();
    });

    test('is a no-op when there is nothing to write', async () => {
      const get = jest.fn();
      const strapi = asStrapi({ get });

      await restoreContentStructure(strapi, null);
      await restoreContentStructure(strapi, undefined);

      expect(get).not.toHaveBeenCalled();
    });

    test('is a no-op when the content-structure service is unavailable', async () => {
      const strapi = asStrapi({
        get: jest.fn(() => {
          throw new Error('Could not resolve service content-structure');
        }),
      });

      await expect(restoreContentStructure(strapi, groupsFile)).resolves.toBeUndefined();
    });
  });
});
