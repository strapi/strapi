
import adminFileController from '../admin-file';

describe('Admin File Controller - find', () => {
  let strapi;

  beforeEach(() => {
    const uploadService = {
      findPage: jest.fn().mockResolvedValue({ results: [], pagination: {} }),
    };

    const fileService = {
      signFileUrls: jest.fn((f) => f),
    };

    const pm = {
      isAllowed: true,
      validateQuery: jest.fn(),
      sanitizeQuery: jest.fn((q) => q),
      addPermissionsQueryTo: jest.fn((q) => q),
      sanitizeOutput: jest.fn((data) => data),
    };

    strapi = {
      service: jest.fn().mockImplementation((name) => {
        if (name === 'admin::permission') {
          return {
            createPermissionsManager: jest.fn().mockReturnValue(pm),
          };
        }
      }),
      admin: {
        services: {
          permission: {
            createPermissionsManager: jest.fn().mockReturnValue(pm),
          },
        },
      },
      plugin: jest.fn().mockImplementation((name) => {
        if (name === 'upload') {
          return {
            service: jest.fn().mockImplementation((serviceName) => {
              if (serviceName === 'upload') return uploadService;
              if (serviceName === 'file') return fileService;
            }),
          };
        }
      }),
      plugins: {
        upload: {
          services: {
            upload: uploadService,
            file: fileService,
          },
        },
      },
    };
    global.strapi = strapi;
  });

  afterEach(() => {
    delete global.strapi;
  });

  test('normalizes folder ID in query if passed as a primitive', async () => {
    const ctx = {
      state: { userAbility: {} },
      query: { folder: '2' },
    } as any;

    await adminFileController.find(ctx);

    expect(ctx.query.folder).toEqual({ $eq: '2' });
  });

  test('does not normalize folder if it is already an object', async () => {
    const ctx = {
      state: { userAbility: {} },
      query: { folder: { $ne: '2' } },
    } as any;

    await adminFileController.find(ctx);

    expect(ctx.query.folder).toEqual({ $ne: '2' });
  });

  test('cleans empty string filters from query', async () => {
    const ctx = {
      state: { userAbility: {} },
      query: { 
        folder: '2',
        filters: {
          $and: [
            { folderPath: { $eq: '' } },
            { name: { $contains: 'test' } }
          ]
        }
      },
    } as any;

    await adminFileController.find(ctx);

    expect(ctx.query.folder).toEqual({ $eq: '2' });
    expect(ctx.query.filters.$and).toHaveLength(1);
    expect(ctx.query.filters.$and[0]).toEqual({ name: { $contains: 'test' } });
  });
});
