import { emitAudit } from '@strapi/utils';

import {
  emitMediaMoves,
  getUploadSettingsChanges,
  readMediaMoves,
  registerAuditEvents,
} from '../audit-logs';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  emitAudit: jest.fn(),
}));

const getTransformers = () => {
  const transformers: Record<string, (...args: any[]) => any> = {};

  registerAuditEvents({
    registerEvent(name: string, transform: any) {
      transformers[name] = transform;
    },
  });

  return transformers;
};

const settings = {
  sizeOptimization: true,
  responsiveDimensions: true,
  autoOrientation: false,
  aiMetadata: true,
};

describe('Upload audit events', () => {
  test('registers the upload events', () => {
    expect(Object.keys(getTransformers())).toEqual(['upload-settings.update', 'media.move']);
  });

  test('upload-settings.update has a resource with no id and carries the changes', () => {
    const changes = { sizeOptimization: { before: true, after: false } };

    expect(getTransformers()['upload-settings.update']({ changes })).toEqual({
      resource: { type: 'upload-settings' },
      details: { changes },
    });
  });

  describe('getUploadSettingsChanges', () => {
    test('records each changed option', () => {
      expect(
        getUploadSettingsChanges(settings, {
          ...settings,
          sizeOptimization: false,
          aiMetadata: false,
        })
      ).toEqual({
        sizeOptimization: { before: true, after: false },
        aiMetadata: { before: true, after: false },
      });
    });

    test('returns no changes for identical values', () => {
      expect(getUploadSettingsChanges(settings, { ...settings })).toEqual({});
    });

    test('records an option missing from the new value as null', () => {
      const { autoOrientation, ...withoutAutoOrientation } = settings;

      expect(getUploadSettingsChanges(settings, withoutAutoOrientation)).toEqual({
        autoOrientation: { before: false, after: null },
      });
    });

    test('records every option when nothing was stored', () => {
      expect(getUploadSettingsChanges(null, settings)).toEqual({
        sizeOptimization: { before: null, after: true },
        responsiveDimensions: { before: null, after: true },
        autoOrientation: { before: null, after: false },
        aiMetadata: { before: null, after: true },
      });
    });

    test('ignores keys outside the four options', () => {
      expect(getUploadSettingsChanges(settings, { ...settings, extra: 1 } as any)).toEqual({});
    });
  });

  describe('media.move', () => {
    const blog = { id: 7, name: 'Blog' };

    test('has the moved file as resource and the folders as details', () => {
      expect(
        getTransformers()['media.move']({
          kind: 'file',
          id: 12,
          name: 'hero.png',
          from: null,
          to: blog,
        })
      ).toEqual({
        resource: { type: 'media', id: 12, name: 'hero.png' },
        details: { from: null, to: blog },
      });
    });

    test('has the moved folder as resource', () => {
      expect(
        getTransformers()['media.move']({
          kind: 'folder',
          id: 3,
          name: 'Old',
          from: blog,
          to: null,
        })
      ).toEqual({
        resource: { type: 'media-folder', id: 3, name: 'Old' },
        details: { from: blog, to: null },
      });
    });
  });

  describe('readMediaMoves', () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      files_folder_lnk: [
        { file_id: 1, folder_id: 7 },
        { file_id: 2, folder_id: '8' },
      ],
      upload_folders_parent_lnk: [{ folder_id: 5, inv_folder_id: 7 }],
      upload_folders: [
        { id: 7, name: 'Blog' },
        { id: 8, name: 'News' },
        { id: 9, name: 'Archive' },
      ],
    };

    const read = jest.fn((table: string | undefined) => ({
      select: (...columns: string[]) => ({
        whereIn: async (column: string, values: readonly number[]) =>
          (tables[table!] ?? [])
            .filter((row) => values.includes(Number(row[column])))
            .map((row) => Object.fromEntries(columns.map((c) => [c, row[c]]))),
      }),
    }));

    const options = {
      fileFolderJoinTable: {
        name: 'files_folder_lnk',
        joinColumn: { name: 'file_id' },
        inverseJoinColumn: { name: 'folder_id' },
      },
      folderParentJoinTable: {
        name: 'upload_folders_parent_lnk',
        joinColumn: { name: 'folder_id' },
        inverseJoinColumn: { name: 'inv_folder_id' },
      },
      folderTable: 'upload_folders',
    };

    beforeEach(() => read.mockClear());

    test('builds one event per file and folder with numeric ids and folder names', async () => {
      const moves = await readMediaMoves(read, {
        ...options,
        files: [
          { id: 1, name: 'a.png' },
          { id: '2', name: 'b.png' },
          { id: 3, name: 'c.png' },
        ],
        folders: [{ id: 5, name: 'Sub' }],
        destinationFolderId: '9',
      });

      const archive = { id: 9, name: 'Archive' };
      expect(moves).toEqual([
        { kind: 'file', id: 1, name: 'a.png', from: { id: 7, name: 'Blog' }, to: archive },
        { kind: 'file', id: 2, name: 'b.png', from: { id: 8, name: 'News' }, to: archive },
        { kind: 'file', id: 3, name: 'c.png', from: null, to: archive },
        { kind: 'folder', id: 5, name: 'Sub', from: { id: 7, name: 'Blog' }, to: archive },
      ]);
    });

    test('records the root as null', async () => {
      const moves = await readMediaMoves(read, {
        ...options,
        files: [{ id: 3, name: 'c.png' }],
        folders: [],
        destinationFolderId: null,
      });

      expect(moves).toEqual([{ kind: 'file', id: 3, name: 'c.png', from: null, to: null }]);
      // Nothing to look up: no parent folder and the root as destination.
      expect(read).toHaveBeenCalledTimes(1);
    });
  });

  describe('emitMediaMoves', () => {
    const strapi = {} as any;
    const blog = { id: 7, name: 'Blog' };

    beforeEach(() => jest.mocked(emitAudit).mockClear());

    test('emits one media.move per moved item', async () => {
      const moves = [
        { kind: 'file' as const, id: 1, name: 'a.png', from: null, to: blog },
        { kind: 'folder' as const, id: 5, name: 'Sub', from: { id: 8, name: 'News' }, to: blog },
      ];

      await emitMediaMoves({ strapi }, moves);

      expect(emitAudit).toHaveBeenCalledTimes(2);
      expect(emitAudit).toHaveBeenNthCalledWith(1, { strapi }, 'media.move', moves[0]);
      expect(emitAudit).toHaveBeenNthCalledWith(2, { strapi }, 'media.move', moves[1]);
    });

    test('skips items already in the destination', async () => {
      await emitMediaMoves({ strapi }, [
        { kind: 'file', id: 1, name: 'a.png', from: blog, to: blog },
        { kind: 'file', id: 2, name: 'b.png', from: null, to: null },
      ]);

      expect(emitAudit).not.toHaveBeenCalled();
    });
  });
});
