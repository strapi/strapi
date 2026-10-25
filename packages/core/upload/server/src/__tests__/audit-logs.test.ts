import { emitAudit } from '@strapi/utils';

import {
  emitMediaMoves,
  getFolderChanges,
  getMediaChanges,
  getUploadSettingsChanges,
  readMediaMoves,
  registerAuditEvents,
} from '../audit-logs';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  emitAudit: jest.fn(),
}));

const getRegistrations = () => {
  const registrations: Record<
    string,
    { transform: (...args: any[]) => any; options?: Record<string, any> }
  > = {};

  registerAuditEvents({
    registerEvent(name: string, transform: any, options?: Record<string, any>) {
      registrations[name] = { transform, options };
    },
  });

  return registrations;
};

const getTransformers = () =>
  Object.fromEntries(
    Object.entries(getRegistrations()).map(([name, { transform }]) => [name, transform])
  );

const settings = {
  sizeOptimization: true,
  responsiveDimensions: true,
  autoOrientation: false,
  aiMetadata: true,
};

describe('Upload audit events', () => {
  test('registers the upload events', () => {
    expect(Object.keys(getTransformers())).toEqual([
      'upload-settings.update',
      'media.create',
      'media.update.audit',
      'media.delete',
      'media-folder.create',
      'media-folder.update',
      'media-folder.delete.audit',
      'media.move',
    ]);
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

  describe('media files', () => {
    const file = {
      id: 12,
      name: 'hero.png',
      mime: 'image/png',
      size: 10.5,
      hash: 'hero_abc',
      url: '/uploads/hero_abc.png',
      alternativeText: null,
      caption: null,
      focalPoint: null,
      folder: { id: 7, name: 'Blog' },
    };

    test('media.create has the file as resource, and its type and size as details', () => {
      expect(getTransformers()['media.create']({ media: file })).toEqual({
        resource: { type: 'media', id: 12, name: 'hero.png' },
        details: { mime: 'image/png', size: 10.5 },
      });
    });

    test('media.delete has the file as resource and no details', () => {
      expect(getTransformers()['media.delete']({ media: file })).toEqual({
        resource: { type: 'media', id: 12, name: 'hero.png' },
      });
    });

    test('media.update is recorded from its audit event, under the media.update action', () => {
      expect(getRegistrations()['media.update.audit'].options).toMatchObject({
        action: 'media.update',
      });
    });

    test('media.update records the changed fields only', () => {
      const updated = { ...file, name: 'cover.png', alternativeText: 'A cover' };

      expect(getTransformers()['media.update.audit']({ file: updated, previous: file })).toEqual({
        resource: { type: 'media', id: 12, name: 'cover.png' },
        details: {
          changes: {
            name: { before: 'hero.png', after: 'cover.png' },
            alternativeText: { before: null, after: 'A cover' },
          },
        },
      });
    });

    test('media.update records a folder change and a moved-to-root file', () => {
      expect(getMediaChanges({ file: { ...file, folder: null }, previous: file })).toEqual({
        folder: { before: { id: 7, name: 'Blog' }, after: null },
      });
    });

    test('media.update records a replaced file, which keeps its hash and url', () => {
      const replaced = { ...file, mime: 'image/jpeg', size: 20 };

      const changes = getMediaChanges({ file: replaced, previous: file, replaced: true });

      expect(changes).toEqual({
        file: {
          before: { name: 'hero.png', mime: 'image/png', size: 10.5 },
          after: { name: 'hero.png', mime: 'image/jpeg', size: 20 },
        },
      });
      expect(JSON.stringify(changes)).not.toMatch(/hero_|uploads/);
    });

    test('media.update records a replace even when the new file has the same type and size', () => {
      expect(getMediaChanges({ file: { ...file }, previous: file, replaced: true })).toHaveProperty(
        'file'
      );
    });

    test('media.update records no file change when the file was not replaced', () => {
      expect(getMediaChanges({ file: { ...file, size: 20 }, previous: file })).toEqual({});
    });

    test('media.update treats an empty text as the null the field held', () => {
      expect(
        getMediaChanges({ file: { ...file, alternativeText: '', caption: '' }, previous: file })
      ).toEqual({});
      expect(
        getMediaChanges({ file: { ...file, caption: 'New' }, previous: { ...file, caption: '' } })
      ).toEqual({ caption: { before: '', after: 'New' } });
    });

    test('media.update records a focal point change', () => {
      expect(
        getMediaChanges({ file: { ...file, focalPoint: { x: 10, y: 20 } }, previous: file })
      ).toEqual({ focalPoint: { before: null, after: { x: 10, y: 20 } } });
    });

    test('media.update is recorded only when something changed', () => {
      const { shouldRecord } = getRegistrations()['media.update.audit'].options!;

      expect(shouldRecord({ file, previous: { ...file } })).toBe(false);
      expect(shouldRecord({ file: { ...file, caption: 'New' }, previous: file })).toBe(true);
    });
  });

  describe('media folders', () => {
    const folder = { id: 3, name: 'Old', parent: { id: 7, name: 'Blog' } };

    test('are recorded under the media actions', () => {
      const registrations = getRegistrations();

      expect(registrations['media-folder.create'].options).toEqual({ action: 'media.create' });
      expect(registrations['media-folder.update'].options).toMatchObject({
        action: 'media.update',
      });
      expect(registrations['media-folder.delete.audit'].options).toEqual({
        action: 'media.delete',
      });
    });

    test('create and delete have the folder as resource', () => {
      const transformers = getTransformers();
      const resource = { type: 'media-folder', id: 3, name: 'Old' };

      expect(transformers['media-folder.create']({ folder })).toEqual({ resource });
      expect(transformers['media-folder.delete.audit']({ folder })).toEqual({ resource });
    });

    test('update records a rename and a new parent', () => {
      expect(
        getTransformers()['media-folder.update']({
          folder: { ...folder, name: 'Archive', parent: null },
          previous: folder,
        })
      ).toEqual({
        resource: { type: 'media-folder', id: 3, name: 'Archive' },
        details: {
          changes: {
            name: { before: 'Old', after: 'Archive' },
            parent: { before: { id: 7, name: 'Blog' }, after: null },
          },
        },
      });
    });

    test('update is recorded only when something changed', () => {
      const { shouldRecord } = getRegistrations()['media-folder.update'].options!;

      expect(shouldRecord({ folder, previous: { ...folder } })).toBe(false);
      expect(getFolderChanges({ folder })).toEqual({});
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
