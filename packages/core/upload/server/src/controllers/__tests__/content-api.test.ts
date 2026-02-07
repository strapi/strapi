import type { Context } from 'koa';

import contentApiController from '../content-api';
import { getService } from '../../utils';

jest.mock('../../utils');

const mockGetService = getService as jest.MockedFunction<typeof getService>;

describe('Content API Controller - Pagination', () => {
  let mockContext: Context;
  let mockUploadService: any;
  let mockFileService: any;
  let mockValidateQuery: jest.Mock;
  let mockSanitizeQuery: jest.Mock;
  let mockSanitizeOutput: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock upload service with both findPage and findMany methods
    mockUploadService = {
      findPage: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    // Mock file service
    mockFileService = {
      signFileUrls: jest.fn((file) => Promise.resolve(file)),
    };

    mockGetService.mockImplementation((serviceName: string) => {
      if (serviceName === 'upload') return mockUploadService;
      if (serviceName === 'file') return mockFileService;
      return {};
    });

    // Mock Strapi contentAPI methods
    mockValidateQuery = jest.fn().mockResolvedValue(undefined);
    mockSanitizeQuery = jest.fn((query) => Promise.resolve(query));
    mockSanitizeOutput = jest.fn((data) => Promise.resolve(data));

    globalThis.strapi = {
      getModel: jest.fn().mockReturnValue({ uid: 'plugin::upload.file' }),
      contentAPI: {
        validate: { query: mockValidateQuery },
        sanitize: {
          query: mockSanitizeQuery,
          output: mockSanitizeOutput,
        },
      },
    };

    mockContext = {
      query: {},
      state: { auth: {} },
      body: undefined,
      notFound: jest.fn(),
    } as unknown as Context;
  });

  describe('find - Backward Compatibility (Legacy Behavior)', () => {
    it('should return flat array when no pagination params provided', async () => {
      const mockFiles = [
        { id: 1, name: 'file1.jpg', url: '/uploads/file1.jpg' },
        { id: 2, name: 'file2.jpg', url: '/uploads/file2.jpg' },
      ];

      mockUploadService.findMany.mockResolvedValue(mockFiles);

      const controller = contentApiController({ strapi: globalThis.strapi as any });
      await controller.find(mockContext);

      // Should call findMany (not findPage) for backward compatibility
      expect(mockUploadService.findMany).toHaveBeenCalledWith({});
      expect(mockUploadService.findPage).not.toHaveBeenCalled();

      // Should return flat array (legacy format)
      expect(mockContext.body).toEqual(mockFiles);
      expect(mockContext.body).not.toHaveProperty('data');
      expect(mockContext.body).not.toHaveProperty('meta');
    });

    it('should return flat array when pagination is not in query', async () => {
      mockContext.query = {
        filters: { mime: { $startsWith: 'image/' } },
        sort: 'createdAt:desc',
      };

      const mockFiles = [{ id: 1, name: 'image.jpg', mime: 'image/jpeg' }];

      mockSanitizeQuery.mockResolvedValue({
        filters: { mime: { $startsWith: 'image/' } },
        sort: 'createdAt:desc',
      });
      mockUploadService.findMany.mockResolvedValue(mockFiles);

      const controller = contentApiController({ strapi: globalThis.strapi as any });
      await controller.find(mockContext);

      expect(mockUploadService.findMany).toHaveBeenCalled();
      expect(mockContext.body).toEqual(mockFiles);
    });

    it('should properly sanitize output in legacy mode', async () => {
      const mockFiles = [{ id: 1, name: 'file1.jpg', secretField: 'secret' }];
      const sanitizedFiles = [{ id: 1, name: 'file1.jpg' }];

      mockUploadService.findMany.mockResolvedValue(mockFiles);
      mockSanitizeOutput.mockResolvedValue(sanitizedFiles);

      const controller = contentApiController({ strapi: globalThis.strapi as any });
      await controller.find(mockContext);

      expect(mockSanitizeOutput).toHaveBeenCalled();
      expect(mockContext.body).toEqual(sanitizedFiles);
    });
  });

  describe('find - Paginated Response (New Behavior)', () => {
    it('should return paginated format when pagination params provided', async () => {
      mockContext.query = {
        pagination: { pageSize: 2 },
      };

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

      mockSanitizeQuery.mockResolvedValue({ pagination: { pageSize: 2 } });
      mockUploadService.findPage.mockResolvedValue({
        results: mockFiles,
        pagination: mockPagination,
      });

      const controller = contentApiController({ strapi: globalThis.strapi as any });
      await controller.find(mockContext);

      // Should call findPage (not findMany)
      expect(mockUploadService.findPage).toHaveBeenCalledWith({
        pagination: { pageSize: 2 },
      });
      expect(mockUploadService.findMany).not.toHaveBeenCalled();

      // Should return paginated format
      expect(mockContext.body).toEqual({
        data: mockFiles,
        meta: {
          pagination: mockPagination,
        },
      });
    });

    it('should support page navigation with pagination[page] and pagination[pageSize]', async () => {
      mockContext.query = {
        pagination: { page: 2, pageSize: 2 },
      };

      const mockFiles = [
        { id: 3, name: 'file3.jpg' },
        { id: 4, name: 'file4.jpg' },
      ];
      const mockPagination = {
        page: 2,
        pageSize: 2,
        pageCount: 5,
        total: 10,
      };

      mockSanitizeQuery.mockResolvedValue({ pagination: { page: 2, pageSize: 2 } });
      mockUploadService.findPage.mockResolvedValue({
        results: mockFiles,
        pagination: mockPagination,
      });

      const controller = contentApiController({ strapi: globalThis.strapi as any });
      await controller.find(mockContext);

      expect(mockUploadService.findPage).toHaveBeenCalledWith({
        pagination: { page: 2, pageSize: 2 },
      });
      expect(mockContext.body?.meta.pagination.page).toBe(2);
      expect(mockContext.body?.data).toEqual(mockFiles);
    });

    it('should include withCount in pagination metadata when requested', async () => {
      mockContext.query = {
        pagination: { pageSize: 2, withCount: true },
      };

      const mockFiles = [{ id: 1, name: 'file1.jpg' }];
      const mockPagination = {
        page: 1,
        pageSize: 2,
        pageCount: 5,
        total: 10,
      };

      mockSanitizeQuery.mockResolvedValue({ pagination: { pageSize: 2, withCount: true } });
      mockUploadService.findPage.mockResolvedValue({
        results: mockFiles,
        pagination: mockPagination,
      });

      const controller = contentApiController({ strapi: globalThis.strapi as any });
      await controller.find(mockContext);

      expect(mockContext.body?.meta.pagination).toHaveProperty('total');
      expect(mockContext.body?.meta.pagination).toHaveProperty('pageCount');
    });

    it('should return empty data array with pagination when no files exist', async () => {
      mockContext.query = {
        pagination: { pageSize: 10 },
      };

      const mockPagination = {
        page: 1,
        pageSize: 10,
        pageCount: 0,
        total: 0,
      };

      mockSanitizeQuery.mockResolvedValue({ pagination: { pageSize: 10 } });
      mockUploadService.findPage.mockResolvedValue({
        results: [],
        pagination: mockPagination,
      });

      const controller = contentApiController({ strapi: globalThis.strapi as any });
      await controller.find(mockContext);

      expect(mockContext.body).toEqual({
        data: [],
        meta: {
          pagination: mockPagination,
        },
      });
    });

    it('should properly sanitize output in paginated mode', async () => {
      mockContext.query = {
        pagination: { pageSize: 5 },
      };

      const mockFiles = [{ id: 1, name: 'file1.jpg', secretField: 'secret' }];
      const sanitizedFiles = [{ id: 1, name: 'file1.jpg' }];
      const mockPagination = {
        page: 1,
        pageSize: 5,
        pageCount: 1,
        total: 1,
      };

      mockSanitizeQuery.mockResolvedValue({ pagination: { pageSize: 5 } });
      mockUploadService.findPage.mockResolvedValue({
        results: mockFiles,
        pagination: mockPagination,
      });
      mockSanitizeOutput.mockResolvedValue(sanitizedFiles);

      const controller = contentApiController({ strapi: globalThis.strapi as any });
      await controller.find(mockContext);

      expect(mockSanitizeOutput).toHaveBeenCalled();
      expect(mockContext.body?.data).toEqual(sanitizedFiles);
      expect(mockContext.body?.data[0]).not.toHaveProperty('secretField');
    });

    it('should maintain filters and sorting with pagination', async () => {
      mockContext.query = {
        pagination: { pageSize: 5 },
        filters: { mime: { $startsWith: 'image/' } },
        sort: 'createdAt:desc',
      };

      const sanitizedQuery = {
        pagination: { pageSize: 5 },
        filters: { mime: { $startsWith: 'image/' } },
        sort: 'createdAt:desc',
      };

      mockSanitizeQuery.mockResolvedValue(sanitizedQuery);
      mockUploadService.findPage.mockResolvedValue({
        results: [{ id: 1, name: 'image.jpg', mime: 'image/jpeg' }],
        pagination: { page: 1, pageSize: 5, pageCount: 1, total: 1 },
      });

      const controller = contentApiController({ strapi: globalThis.strapi as any });
      await controller.find(mockContext);

      expect(mockUploadService.findPage).toHaveBeenCalledWith(sanitizedQuery);
      expect(mockContext.body?.data).toHaveLength(1);
    });
  });

  describe('find - Query Validation', () => {
    it('should validate query before processing (legacy mode)', async () => {
      mockContext.query = {
        filters: { name: { $contains: 'test' } },
      };

      mockUploadService.findMany.mockResolvedValue([]);

      const controller = contentApiController({ strapi: globalThis.strapi as any });
      await controller.find(mockContext);

      expect(mockValidateQuery).toHaveBeenCalled();
    });

    it('should validate query before processing (paginated mode)', async () => {
      mockContext.query = {
        pagination: { pageSize: 100 },
        filters: { name: { $contains: 'test' } },
      };

      mockSanitizeQuery.mockResolvedValue({
        pagination: { pageSize: 100 },
        filters: { name: { $contains: 'test' } },
      });
      mockUploadService.findPage.mockResolvedValue({
        results: [],
        pagination: { page: 1, pageSize: 100, pageCount: 0, total: 0 },
      });

      const controller = contentApiController({ strapi: globalThis.strapi as any });
      await controller.find(mockContext);

      expect(mockValidateQuery).toHaveBeenCalled();
    });

    it('should sanitize query params before calling service', async () => {
      const unsanitizedQuery = {
        pagination: { pageSize: 10 },
        filters: { name: { $contains: 'test' } },
        populate: '*',
      };
      const sanitizedQuery = {
        pagination: { pageSize: 10 },
        filters: { name: { $contains: 'test' } },
      };

      mockContext.query = unsanitizedQuery;
      mockSanitizeQuery.mockResolvedValue(sanitizedQuery);
      mockUploadService.findPage.mockResolvedValue({
        results: [],
        pagination: { page: 1, pageSize: 10, pageCount: 0, total: 0 },
      });

      const controller = contentApiController({ strapi: globalThis.strapi as any });
      await controller.find(mockContext);

      expect(mockSanitizeQuery).toHaveBeenCalled();
      expect(mockUploadService.findPage).toHaveBeenCalledWith(sanitizedQuery);
    });
  });
});
