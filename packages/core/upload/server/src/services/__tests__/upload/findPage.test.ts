import uploadServiceFactory from '../../upload';
import { getService } from '../../../utils';

jest.mock('../../../utils');

const mockGetService = getService as jest.MockedFunction<typeof getService>;

describe('Upload Service - findPage', () => {
  let mockTransform: jest.Mock;
  let mockDbFindPage: jest.Mock;
  let mockSignFileUrls: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTransform = jest.fn((uid: string, query: any) => query);
    mockDbFindPage = jest.fn();
    mockSignFileUrls = jest.fn((file: any) => Promise.resolve(file));

    mockGetService.mockImplementation((serviceName: string) => {
      if (serviceName === 'file') {
        return { signFileUrls: mockSignFileUrls };
      }
      if (serviceName === 'metrics') {
        return { trackUsage: jest.fn() };
      }
      return {};
    });

    globalThis.strapi = {
      db: {
        query: jest.fn().mockReturnValue({
          findPage: mockDbFindPage,
          findMany: jest.fn(),
        }),
      },
      get: jest.fn().mockReturnValue({
        transform: mockTransform,
      }),
      config: {
        get: jest.fn().mockReturnValue({}),
      },
      getModel: jest.fn().mockReturnValue({ uid: 'plugin::upload.file' }),
      store: jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn() }),
      plugin: jest.fn().mockReturnValue({ provider: {} }),
      webhookStore: { allowedEvents: new Map() },
    } as any;
  });

  it('should flatten nested pagination params to top-level for query-params transform', async () => {
    // This simulates the query shape after Koa qs.parse and sanitizeQuery:
    // ?pagination[page]=2&pagination[pageSize]=2 → { pagination: { page: 2, pageSize: 2 } }
    const query = {
      pagination: { page: 2, pageSize: 2 },
      filters: { mime: { $startsWith: 'image/' } },
    };

    mockDbFindPage.mockResolvedValue({
      results: [{ id: 3, name: 'file3.jpg' }],
      pagination: { page: 2, pageSize: 2, pageCount: 5, total: 10 },
    });

    const service = uploadServiceFactory({ strapi: globalThis.strapi as any });
    await service.findPage(query);

    // The transform should receive flattened params with page/pageSize at top level,
    // NOT nested inside a pagination object
    expect(mockTransform).toHaveBeenCalledWith('plugin::upload.file', {
      page: 2,
      pageSize: 2,
      filters: { mime: { $startsWith: 'image/' } },
    });
  });

  it('should handle pagination with only pageSize (page defaults handled by DB layer)', async () => {
    const query = {
      pagination: { pageSize: 5 },
    };

    mockDbFindPage.mockResolvedValue({
      results: [],
      pagination: { page: 1, pageSize: 5, pageCount: 0, total: 0 },
    });

    const service = uploadServiceFactory({ strapi: globalThis.strapi as any });
    await service.findPage(query);

    expect(mockTransform).toHaveBeenCalledWith('plugin::upload.file', {
      pageSize: 5,
    });
  });

  it('should handle pagination with withCount parameter', async () => {
    const query = {
      pagination: { page: 1, pageSize: 10, withCount: true },
    };

    mockDbFindPage.mockResolvedValue({
      results: [{ id: 1, name: 'file1.jpg' }],
      pagination: { page: 1, pageSize: 10, pageCount: 1, total: 1 },
    });

    const service = uploadServiceFactory({ strapi: globalThis.strapi as any });
    await service.findPage(query);

    expect(mockTransform).toHaveBeenCalledWith('plugin::upload.file', {
      page: 1,
      pageSize: 10,
      withCount: true,
    });
  });

  it('should work with query that has no pagination key (empty query)', async () => {
    const query = {};

    mockDbFindPage.mockResolvedValue({
      results: [],
      pagination: { page: 1, pageSize: 10, pageCount: 0, total: 0 },
    });

    const service = uploadServiceFactory({ strapi: globalThis.strapi as any });
    await service.findPage(query);

    // With no pagination key, the query should be passed as-is
    expect(mockTransform).toHaveBeenCalledWith('plugin::upload.file', {});
  });

  it('should preserve filters and sort when flattening pagination', async () => {
    const query = {
      pagination: { page: 3, pageSize: 25 },
      filters: { name: { $contains: 'photo' } },
      sort: 'createdAt:desc',
    };

    mockDbFindPage.mockResolvedValue({
      results: [],
      pagination: { page: 3, pageSize: 25, pageCount: 0, total: 0 },
    });

    const service = uploadServiceFactory({ strapi: globalThis.strapi as any });
    await service.findPage(query);

    expect(mockTransform).toHaveBeenCalledWith('plugin::upload.file', {
      page: 3,
      pageSize: 25,
      filters: { name: { $contains: 'photo' } },
      sort: 'createdAt:desc',
    });
  });

  it('should return results with pagination metadata', async () => {
    const mockFiles = [
      { id: 1, name: 'file1.jpg' },
      { id: 2, name: 'file2.jpg' },
    ];
    const mockPagination = {
      page: 1,
      pageSize: 2,
      pageCount: 5,
      total: 10,
    };

    mockDbFindPage.mockResolvedValue({
      results: mockFiles,
      pagination: mockPagination,
    });

    const service = uploadServiceFactory({ strapi: globalThis.strapi as any });
    const result = await service.findPage({ pagination: { pageSize: 2 } });

    expect(result).toEqual({
      results: mockFiles,
      pagination: mockPagination,
    });
  });

  it('should sign file URLs for results', async () => {
    const mockFiles = [{ id: 1, name: 'file1.jpg', url: '/uploads/file1.jpg' }];
    const signedFiles = [{ id: 1, name: 'file1.jpg', url: 'https://cdn.example.com/file1.jpg' }];

    mockDbFindPage.mockResolvedValue({
      results: mockFiles,
      pagination: { page: 1, pageSize: 10, pageCount: 1, total: 1 },
    });
    mockSignFileUrls.mockResolvedValue(signedFiles[0]);

    const service = uploadServiceFactory({ strapi: globalThis.strapi as any });
    const result = await service.findPage({ pagination: { pageSize: 10 } });

    expect(mockSignFileUrls).toHaveBeenCalledWith(mockFiles[0]);
    expect(result.results).toEqual(signedFiles);
  });
});
