import path from 'path';
import fse from 'fs-extra';

import type { Core } from '@strapi/types';
import { createContentStructureService, CONTENT_STRUCTURE_FILE_NAME } from '../index';

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  readJSON: jest.fn(),
  ensureDir: jest.fn(() => Promise.resolve()),
  writeJSON: jest.fn(() => Promise.resolve()),
}));

const fseMock = fse as jest.Mocked<typeof fse>;

const CONTENT_STRUCTURE_DIR = '/app/src/content-structure';
const FILE_PATH = path.join(CONTENT_STRUCTURE_DIR, CONTENT_STRUCTURE_FILE_NAME);

type MockContentTypes = Record<string, { kind?: string }>;

const setup = (
  options: {
    exists?: boolean;
    read?: unknown;
    readError?: Error;
    contentTypes?: MockContentTypes;
  } = {}
) => {
  const { exists = true, read, readError, contentTypes = {} } = options;

  fseMock.pathExists.mockResolvedValue(exists as never);

  if (readError) {
    fseMock.readJSON.mockRejectedValue(readError);
  } else {
    fseMock.readJSON.mockResolvedValue(read as never);
  }

  const warn = jest.fn();
  const error = jest.fn();

  const strapi = {
    dirs: { app: { contentStructure: CONTENT_STRUCTURE_DIR } },
    log: { warn, error },
    contentTypes,
  } as unknown as Core.Strapi;

  return { service: createContentStructureService(strapi), warn, error };
};

const ctChild = (uid: string) => ({ type: 'contentType', uid });
const groupChild = (id: string) => ({ type: 'group', id });
const grp = (id: string, name: string, parent: string | null, children: unknown[] = []) => ({
  id,
  name,
  parent,
  children,
});
const fileWith = (collectionTypes: unknown[] = [], singleTypes: unknown[] = []) => ({
  version: 1,
  sections: {
    collectionTypes: { groups: collectionTypes },
    singleTypes: { groups: singleTypes },
  },
});

const cleanedCollectionGroups = async (service: ReturnType<typeof setup>['service']) => {
  const cleaned = await service.getCleanedFile();
  return cleaned?.sections.collectionTypes.groups ?? [];
};

const ct = (kind: 'collectionType' | 'singleType' = 'collectionType') => ({ kind });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('content-structure service', () => {
  describe('read() — tolerant parsing', () => {
    it('returns null when the file does not exist', async () => {
      const { service, error } = setup({ exists: false });

      await expect(service.read()).resolves.toBeNull();
      expect(fseMock.readJSON).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    });

    it('returns null and logs when the file cannot be parsed', async () => {
      const { service, error } = setup({ readError: new Error('Unexpected token') });

      await expect(service.read()).resolves.toBeNull();
      expect(error).toHaveBeenCalledWith(expect.stringContaining('Could not parse'));
    });

    it('returns null and logs when the parsed value is not an object', async () => {
      const { service, error } = setup({ read: 42 });

      await expect(service.read()).resolves.toBeNull();
      expect(error).toHaveBeenCalledWith(expect.stringContaining('"sections"'));
    });

    it('returns null and logs when the "sections" property is missing', async () => {
      const { service, error } = setup({ read: { version: 1 } });

      await expect(service.read()).resolves.toBeNull();
      expect(error).toHaveBeenCalledWith(expect.stringContaining('"sections"'));
    });

    it('returns null and logs when the version is not 1', async () => {
      const { service, error } = setup({
        read: {
          version: 2,
          sections: { collectionTypes: { groups: [] }, singleTypes: { groups: [] } },
        },
      });

      await expect(service.read()).resolves.toBeNull();
      expect(error).toHaveBeenCalledWith(expect.stringContaining('Unknown version'));
    });

    it('returns the raw file when it is well-formed', async () => {
      const file = fileWith([grp('g1', 'Folder', null)]);
      const { service } = setup({ read: file });

      await expect(service.read()).resolves.toEqual(file);
    });
  });

  describe('getCleanedFile() — group-level drop / reparent rules', () => {
    it('degrades to empty trees when there is no file', async () => {
      const { service } = setup({ exists: false });

      await expect(service.getCleanedFile()).resolves.toBeNull();
      await expect(service.resolve()).resolves.toEqual({ collectionTypes: [], singleTypes: [] });
    });

    it('ignores a malformed section (groups is not an array)', async () => {
      const { service, warn } = setup({
        read: {
          version: 1,
          sections: { collectionTypes: { groups: 'nope' }, singleTypes: { groups: [] } },
        },
      });

      expect(await cleanedCollectionGroups(service)).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('malformed'));
    });

    it('drops a group that fails the shape check (missing children array)', async () => {
      const { service, warn } = setup({
        read: fileWith([{ id: 'g1', name: 'x', parent: null }, grp('g2', 'ok', null)]),
      });

      expect((await cleanedCollectionGroups(service)).map((g) => g.id)).toEqual(['g2']);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('malformed group entry'));
    });

    it('drops a group with an empty (whitespace) name', async () => {
      const { service, warn } = setup({
        read: fileWith([grp('g1', '   ', null), grp('g2', 'ok', null)]),
      });

      expect((await cleanedCollectionGroups(service)).map((g) => g.id)).toEqual(['g2']);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('empty name'));
    });

    it('drops a duplicate group id, keeping the first', async () => {
      const { service, warn } = setup({
        read: fileWith([grp('g1', 'First', null), grp('g1', 'Second', null)]),
      });

      const groups = await cleanedCollectionGroups(service);
      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe('First');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('duplicate group id'));
    });

    it('reparents a group to root when its parent does not exist', async () => {
      const { service, warn } = setup({ read: fileWith([grp('g1', 'A', 'ghost')]) });

      const groups = await cleanedCollectionGroups(service);
      expect(groups.find((g) => g.id === 'g1')?.parent).toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('does not exist'));
    });

    it('reparents to root to break a parent cycle without losing groups', async () => {
      const { service, warn } = setup({
        read: fileWith([grp('g1', 'A', 'g2'), grp('g2', 'B', 'g1')]),
      });

      const groups = await cleanedCollectionGroups(service);
      expect(groups.map((g) => g.id).sort()).toEqual(['g1', 'g2']);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('cycle'));
    });

    it('reparents a group that exceeds the maximum nesting depth', async () => {
      const { service, warn } = setup({
        read: fileWith([
          grp('g1', '1', null),
          grp('g2', '2', 'g1'),
          grp('g3', '3', 'g2'),
          grp('g4', '4', 'g3'), // depth 4 > MAX_DEPTH (3)
        ]),
      });

      const groups = await cleanedCollectionGroups(service);
      expect(groups.find((g) => g.id === 'g4')?.parent).toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('maximum nesting depth'));
    });
  });

  describe('getCleanedFile() — child-level drop / repair rules', () => {
    it('drops a malformed (non-object) child entry', async () => {
      const { service, warn } = setup({ read: fileWith([grp('g1', 'A', null, [42])]) });

      expect((await cleanedCollectionGroups(service))[0].children).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('malformed child'));
    });

    it('drops a contentType child with a non-string uid', async () => {
      const { service, warn } = setup({
        read: fileWith([grp('g1', 'A', null, [{ type: 'contentType', uid: 123 }])]),
      });

      expect((await cleanedCollectionGroups(service))[0].children).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('invalid uid'));
    });

    it('drops a reference to an unknown content type', async () => {
      const { service, warn } = setup({
        read: fileWith([grp('g1', 'A', null, [ctChild('api::ghost.ghost')])]),
      });

      expect((await cleanedCollectionGroups(service))[0].children).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown content type'));
    });

    it('drops a content type whose kind does not match the section', async () => {
      const { service, warn } = setup({
        read: fileWith([grp('g1', 'A', null, [ctChild('api::home.home')])]),
        contentTypes: { 'api::home.home': ct('singleType') },
      });

      expect((await cleanedCollectionGroups(service))[0].children).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('does not belong'));
    });

    it('drops a duplicate content-type reference across groups, keeping the first', async () => {
      const { service, warn } = setup({
        read: fileWith([
          grp('g1', 'A', null, [ctChild('api::a.a')]),
          grp('g2', 'B', null, [ctChild('api::a.a')]),
        ]),
        contentTypes: { 'api::a.a': ct() },
      });

      const groups = await cleanedCollectionGroups(service);
      expect(groups.find((g) => g.id === 'g1')?.children).toEqual([ctChild('api::a.a')]);
      expect(groups.find((g) => g.id === 'g2')?.children).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('duplicate reference'));
    });

    it('drops a group child with a non-string id', async () => {
      const { service, warn } = setup({
        read: fileWith([grp('g1', 'A', null, [{ type: 'group', id: 5 }])]),
      });

      expect((await cleanedCollectionGroups(service))[0].children).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('invalid id'));
    });

    it('drops a group child whose parent pointer is inconsistent', async () => {
      const { service, warn } = setup({
        read: fileWith([grp('g1', 'A', null, [groupChild('g2')]), grp('g2', 'B', null)]),
      });

      expect((await cleanedCollectionGroups(service)).find((g) => g.id === 'g1')?.children).toEqual(
        []
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('inconsistent reference'));
    });

    it('drops a duplicate group child, keeping one', async () => {
      const { service, warn } = setup({
        read: fileWith([
          grp('g1', 'A', null, [groupChild('g2'), groupChild('g2')]),
          grp('g2', 'B', 'g1'),
        ]),
      });

      expect((await cleanedCollectionGroups(service)).find((g) => g.id === 'g1')?.children).toEqual(
        [groupChild('g2')]
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('duplicate group child'));
    });

    it('drops a child with an unknown type', async () => {
      const { service, warn } = setup({
        read: fileWith([grp('g1', 'A', null, [{ type: 'mystery' }])]),
      });

      expect((await cleanedCollectionGroups(service))[0].children).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown type'));
    });

    it('repairs a group that is missing from its parent’s children list', async () => {
      const { service, warn } = setup({
        read: fileWith([grp('g1', 'A', null, []), grp('g2', 'B', 'g1', [])]),
      });

      expect((await cleanedCollectionGroups(service)).find((g) => g.id === 'g1')?.children).toEqual(
        [groupChild('g2')]
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('missing from the children'));
    });
  });

  describe('resolve() — nested tree shape', () => {
    it('builds a nested tree from the flat cleaned groups', async () => {
      const { service } = setup({
        read: fileWith([
          grp('g1', 'Outer', null, [ctChild('api::a.a'), groupChild('g2')]),
          grp('g2', 'Inner', 'g1', [ctChild('api::b.b')]),
        ]),
        contentTypes: { 'api::a.a': ct(), 'api::b.b': ct() },
      });

      const { collectionTypes, singleTypes } = await service.resolve();

      expect(singleTypes).toEqual([]);
      expect(collectionTypes).toEqual([
        {
          type: 'group',
          id: 'g1',
          name: 'Outer',
          children: [
            { type: 'contentType', uid: 'api::a.a' },
            {
              type: 'group',
              id: 'g2',
              name: 'Inner',
              children: [{ type: 'contentType', uid: 'api::b.b' }],
            },
          ],
        },
      ]);
    });
  });

  describe('caching — memoize / invalidate', () => {
    it('reads the file only once across repeated calls', async () => {
      const { service } = setup({ read: fileWith([grp('g1', 'A', null)]) });

      await service.resolve();
      await service.getCleanedFile();
      await service.resolve();

      expect(fseMock.readJSON).toHaveBeenCalledTimes(1);
    });

    it('re-reads after invalidate()', async () => {
      const { service } = setup({ read: fileWith([grp('g1', 'A', null)]) });

      await service.resolve();
      service.invalidate();
      await service.resolve();

      expect(fseMock.readJSON).toHaveBeenCalledTimes(2);
    });

    it('invalidates the cache after a write()', async () => {
      const { service } = setup({ read: fileWith([grp('g1', 'A', null)]) });

      await service.resolve();
      await service.write(fileWith([grp('g1', 'A', null)]) as never);
      await service.resolve();

      expect(fseMock.readJSON).toHaveBeenCalledTimes(2);
    });
  });

  describe('write()', () => {
    it('ensures the directory, writes version 1, then invalidates', async () => {
      const { service } = setup({ read: fileWith() });

      await service.write(fileWith([grp('g1', 'A', null)]) as never);

      expect(fseMock.ensureDir).toHaveBeenCalledWith(CONTENT_STRUCTURE_DIR);
      expect(fseMock.writeJSON).toHaveBeenCalledWith(
        FILE_PATH,
        expect.objectContaining({ version: 1 }),
        { spaces: 2 }
      );
    });
  });

  describe('countGroups()', () => {
    it('counts groups across both sections', async () => {
      const { service } = setup({
        read: fileWith([grp('g1', 'A', null), grp('g2', 'B', null)], [grp('s1', 'S', null)]),
      });

      await expect(service.countGroups()).resolves.toBe(3);
    });

    it('returns 0 when there is no file', async () => {
      const { service } = setup({ exists: false });

      await expect(service.countGroups()).resolves.toBe(0);
    });
  });
});
