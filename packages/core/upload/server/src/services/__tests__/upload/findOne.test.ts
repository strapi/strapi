import createUploadService from '../../upload';
import imageManipulation from '../../image-manipulation';
import fileService from '../../file';

const dbFile = { id: 1, documentId: 'qovkpekciob2wt8qyd51mg8k', name: 'a.png', provider: 'local' };

const findOne = jest.fn().mockResolvedValue(dbFile);
const transform = jest.fn().mockImplementation((_uid: string, query: any) => query);

const buildStrapi = () =>
  ({
    plugins: {
      upload: {
        services: {
          'image-manipulation': imageManipulation,
          file: {
            ...fileService,
            signFileUrls: (file: unknown) => file,
          },
          metrics: { trackUsage: jest.fn() },
        },
      },
    },
    plugin: (name: string) => (global.strapi as any).plugins[name],
    db: {
      query: () => ({ findOne }),
    },
    get: () => ({ transform }),
    getModel: () => ({ attributes: {} }),
  }) as any;

describe('findOne (id or documentId)', () => {
  let uploadService: ReturnType<typeof createUploadService>;

  beforeEach(() => {
    findOne.mockClear().mockResolvedValue(dbFile);
    transform.mockClear();
    global.strapi = buildStrapi();
    uploadService = createUploadService({ strapi: global.strapi } as any);
  });

  test('looks up by numeric id when given a number', async () => {
    await uploadService.findOne(1);

    const [{ where }] = findOne.mock.calls[0];
    expect(where).toEqual({ id: 1 });
  });

  test('looks up by numeric id when given a numeric string (regression)', async () => {
    await uploadService.findOne('1');

    const [{ where }] = findOne.mock.calls[0];
    expect(where).toEqual({ id: '1' });
  });

  test('looks up by documentId when given a non-numeric string', async () => {
    await uploadService.findOne('qovkpekciob2wt8qyd51mg8k');

    const [{ where }] = findOne.mock.calls[0];
    expect(where).toEqual({ documentId: 'qovkpekciob2wt8qyd51mg8k' });
  });

  test('returns null (not a thrown DB error) when the file does not exist', async () => {
    findOne.mockResolvedValueOnce(null);

    await expect(uploadService.findOne('qovkpekciob2wt8qyd51mg8k')).resolves.toBeNull();
  });
});
