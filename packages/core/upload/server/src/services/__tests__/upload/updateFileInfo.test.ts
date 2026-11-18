import createUploadService from '../../upload';
import imageManipulation from '../../image-manipulation';
import fileService from '../../file';

const dbFile = {
  id: 1,
  name: 'existing.png',
  alternativeText: 'existing alt',
  caption: 'existing caption',
  focalPoint: null,
  folder: { id: 2 },
  folderPath: '/2',
  provider: 'local',
};

const update = jest.fn().mockImplementation(({ where, data }) => ({ id: where.id, ...data }));
const dbFindOne = jest.fn().mockResolvedValue(dbFile);
const folderFindOne = jest.fn().mockResolvedValue({ id: 42, name: 'Blog' });

const getFolderPath = jest
  .fn()
  .mockImplementation(async (folderId?: number | null) => (!folderId ? '/' : `/${folderId}`));

global.strapi = {
  plugins: {
    upload: {
      services: {
        'image-manipulation': imageManipulation,
        file: {
          ...fileService,
          getFolderPath,
          signFileUrls: (file: unknown) => file,
        },
        metrics: {
          trackUsage: jest.fn(),
        },
      },
    },
  },
  plugin: (name: string) => global.strapi.plugins[name],
  db: {
    query: (uid: string) =>
      uid === 'plugin::upload.folder'
        ? { findOne: folderFindOne }
        : {
            findOne: dbFindOne,
            update,
          },
  },
  get: () => ({
    transform: (_uid: string, query: unknown) => query,
  }),
  eventHub: {
    emit: jest.fn(),
  },
  getModel: () => ({ attributes: {} }),
} as any;

const uploadService = createUploadService({ strapi: global.strapi } as any);

describe('updateFileInfo', () => {
  beforeEach(() => {
    update.mockClear();
    dbFindOne.mockClear();
    dbFindOne.mockResolvedValue(dbFile);
    getFolderPath.mockClear();
    folderFindOne.mockClear();
    (global.strapi.eventHub.emit as jest.Mock).mockClear();
  });

  test('preserves existing folderPath when folder is not provided (regression for #21904)', async () => {
    // The original bug read `dbFile.path` (a non-existent attribute) which wrote
    // undefined to the folderPath column on every metadata-only update, eventually
    // corrupting folder-scoped queries.
    await uploadService.updateFileInfo(1, { alternativeText: 'new alt' });

    expect(update).toHaveBeenCalledTimes(1);
    const [{ data }] = update.mock.calls[0];
    expect(data).toMatchObject({
      alternativeText: 'new alt',
      folderPath: dbFile.folderPath,
    });
    // The folder relation is left as it is
    expect(data).not.toHaveProperty('folder');
    expect(getFolderPath).not.toHaveBeenCalled();
  });

  test('recomputes folderPath when folder changes', async () => {
    await uploadService.updateFileInfo(1, { folder: 42 });

    const [{ data }] = update.mock.calls[0];
    expect(data).toMatchObject({
      folder: 42,
      folderPath: '/42',
    });
    expect(getFolderPath).toHaveBeenCalledWith(42);
  });

  test('emits media.update for webhooks unchanged, and the audit event with the file as it was', async () => {
    const emit = global.strapi.eventHub.emit as jest.Mock;

    await uploadService.updateFileInfo(1, { alternativeText: 'new alt' });

    const events = Object.fromEntries(emit.mock.calls);
    expect(Object.keys(events)).toEqual(['media.update', 'media.update.audit']);
    expect(Object.keys(events['media.update'])).toEqual(['media']);
    expect(events['media.update.audit']).toMatchObject({
      file: { id: 1, alternativeText: 'new alt', folder: { id: 2, name: null } },
      previous: { id: 1, alternativeText: 'existing alt', folder: { id: 2, name: null } },
    });
    expect(folderFindOne).not.toHaveBeenCalled();
    // The file read by updateFileInfo is the one the audit event compares against
    expect(dbFindOne).toHaveBeenCalledTimes(1);
  });

  test('reads the new folder when the file moves', async () => {
    const emit = global.strapi.eventHub.emit as jest.Mock;

    await uploadService.updateFileInfo(1, { folder: 42 });

    expect(folderFindOne).toHaveBeenCalledWith({ where: { id: 42 }, select: ['id', 'name'] });
    const audit = emit.mock.calls.find(([event]) => event === 'media.update.audit');
    expect(audit[1].file.folder).toEqual({ id: 42, name: 'Blog' });
  });

  test('moves the file to the root when folder is explicitly null', async () => {
    await uploadService.updateFileInfo(1, { folder: null as unknown as number });

    const [{ data }] = update.mock.calls[0];
    expect(data).toMatchObject({
      folder: null,
      folderPath: '/',
    });
    expect(getFolderPath).toHaveBeenCalledWith(null);
  });
});
