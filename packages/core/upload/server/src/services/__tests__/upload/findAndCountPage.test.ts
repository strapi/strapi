import createUploadService from '../../upload';
import imageManipulation from '../../image-manipulation';
import fileService from '../../file';

const files = [
  { id: 1, name: 'a.png', provider: 'local' },
  { id: 2, name: 'b.png', provider: 'local' },
];

const findMany = jest.fn().mockResolvedValue(files);
const count = jest.fn().mockResolvedValue(42);

// Echo the resolved query so we can assert the offset/limit handed to the DB layer.
const transform = jest.fn().mockImplementation((_uid: string, query: any) => query);

const config: Record<string, unknown> = {};

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
      query: () => ({ findMany, count }),
    },
    get: () => ({ transform }),
    config: {
      get: (key: string, defaultValue?: unknown) => (key in config ? config[key] : defaultValue),
    },
    getModel: () => ({ attributes: {} }),
  }) as any;

describe('findAndCountPage', () => {
  let uploadService: ReturnType<typeof createUploadService>;

  beforeEach(() => {
    findMany.mockClear().mockResolvedValue(files);
    count.mockClear().mockResolvedValue(42);
    transform.mockClear();
    for (const k of Object.keys(config)) delete config[k];
    global.strapi = buildStrapi();
    uploadService = createUploadService({ strapi: global.strapi } as any);
  });

  test('page-based: returns results + page-based pagination meta with count', async () => {
    const { results, pagination } = await uploadService.findAndCountPage({
      pagination: { page: 2, pageSize: 10 },
    });

    expect(results).toEqual(files);
    // page 2, pageSize 10 -> offset 10, limit 10 handed to the DB layer
    const [, query] = transform.mock.calls[0];
    expect(query).toMatchObject({ start: 10, limit: 10 });
    expect(query.pagination).toBeUndefined();

    expect(count).toHaveBeenCalledTimes(1);
    expect(pagination).toEqual({ page: 2, pageSize: 10, pageCount: 5, total: 42 });
  });

  test('defaults to api.rest.defaultLimit (25) when no pagination provided', async () => {
    const { pagination } = await uploadService.findAndCountPage({});

    const [, query] = transform.mock.calls[0];
    expect(query).toMatchObject({ start: 0, limit: 25 });
    expect(pagination).toEqual({ page: 1, pageSize: 25, pageCount: 2, total: 42 });
  });

  test('respects a configured api.rest.defaultLimit', async () => {
    config['api.rest.defaultLimit'] = 5;
    global.strapi = buildStrapi();
    uploadService = createUploadService({ strapi: global.strapi } as any);

    const { pagination } = await uploadService.findAndCountPage({});

    const [, query] = transform.mock.calls[0];
    expect(query).toMatchObject({ limit: 5 });
    expect(pagination).toMatchObject({ pageSize: 5 });
  });

  test('caps pageSize at api.rest.maxLimit', async () => {
    config['api.rest.maxLimit'] = 50;
    global.strapi = buildStrapi();
    uploadService = createUploadService({ strapi: global.strapi } as any);

    await uploadService.findAndCountPage({ pagination: { page: 1, pageSize: 1000 } });

    const [, query] = transform.mock.calls[0];
    expect(query.limit).toBe(50);
  });

  test('offset-based: start/limit honored and offset pagination meta returned', async () => {
    const { pagination } = await uploadService.findAndCountPage({
      pagination: { start: 20, limit: 5 },
    });

    const [, query] = transform.mock.calls[0];
    expect(query).toMatchObject({ start: 20, limit: 5 });
    expect(pagination).toEqual({ start: 20, limit: 5, total: 42 });
  });

  test('withCount=false skips the count query and omits total/pageCount', async () => {
    const { pagination } = await uploadService.findAndCountPage({
      pagination: { page: 1, pageSize: 10, withCount: 'false' },
    });

    expect(count).not.toHaveBeenCalled();
    expect(pagination).toEqual({ page: 1, pageSize: 10 });
    expect(pagination).not.toHaveProperty('total');
    expect(pagination).not.toHaveProperty('pageCount');
  });

  test('respects api.rest.withCount=false config default', async () => {
    config['api.rest.withCount'] = false;
    global.strapi = buildStrapi();
    uploadService = createUploadService({ strapi: global.strapi } as any);

    const { pagination } = await uploadService.findAndCountPage({
      pagination: { page: 1, pageSize: 10 },
    });

    expect(count).not.toHaveBeenCalled();
    expect(pagination).not.toHaveProperty('total');
  });

  test('throws on invalid withCount value', async () => {
    await expect(
      uploadService.findAndCountPage({ pagination: { withCount: 'nope' } })
    ).rejects.toThrow(/Invalid withCount parameter/);
  });

  test('signs file urls for every returned result', async () => {
    const signFileUrls = jest.fn((file: unknown) => file);
    global.strapi.plugins.upload.services.file.signFileUrls = signFileUrls;
    uploadService = createUploadService({ strapi: global.strapi } as any);

    await uploadService.findAndCountPage({ pagination: { page: 1, pageSize: 10 } });

    expect(signFileUrls).toHaveBeenCalledTimes(files.length);
  });
});
