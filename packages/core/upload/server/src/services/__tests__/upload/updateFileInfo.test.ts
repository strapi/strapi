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

const update = jest.fn().mockImplementation(({ data }) => data);
const dbFindOne = jest.fn().mockResolvedValue(dbFile);

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
    query: () => ({
      findOne: dbFindOne,
      update,
    }),
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
    dbFindOne.mockResolvedValue(dbFile);
    getFolderPath.mockClear();
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
      folder: dbFile.folder,
      folderPath: dbFile.folderPath,
    });
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

  test('moves the file to the root when folder is explicitly null', async () => {
    // FileInfo.folder is typed as number | undefined, but the runtime accepts
    // null as "no parent" (root). Cast to exercise that branch.
    await uploadService.updateFileInfo(1, { folder: null as unknown as number });

    const [{ data }] = update.mock.calls[0];
    expect(data).toMatchObject({
      folder: null,
      folderPath: '/',
    });
    expect(getFolderPath).toHaveBeenCalledWith(null);
  });
});
