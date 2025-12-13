import type { Context } from 'koa';

import contentApiController from '../content-api';
import { getService } from '../../utils';

jest.mock('../../utils');

const mockGetService = getService as jest.MockedFunction<typeof getService>;

describe('Content API Controller - Pagination', () => {
  let mockContext: Partial<Context>;
  let mockUploadService: any;
  let mockFileService: any;
  let mockValidateQuery: jest.Mock;
  let mockSanitizeQuery: jest.Mock;
  let mockSanitizeOutput: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock upload service with findPage method
    mockUploadService = {
      findPage: jest.fn(),
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

    global.strapi = {
      getModel: jest.fn().mockReturnValue({ uid: 'plugin::upload.file' }),
      contentAPI: {
        validate: { query: mockValidateQuery },
        sanitize: {
          query: mockSanitizeQuery,
          output: mockSanitizeOutput,
        },
      },
    } as any;

    mockContext = {
      query: {} as any,
      state: { auth: {} },
      body: undefined as any,
      notFound: jest.fn(),
    } as any;
  });

  describe('find - Pagination Support', () => {
    it('should return paginated results with default pagination when no params provided', async () => {
      const mockFiles = [
        { id: 1, name: 'file1.jpg', url: '/uploads/file1.jpg' },
        { id: 2, name: 'file2.jpg', url: '/uploads/file2.jpg' },
      ];
      const mockPagination = {
        page: 1,
        pageSize: 25,
        pageCount: 1,
        total: 2,
      };

      mockUploadService.findPage.mockResolvedValue({
        results: mockFiles,
        pagination: mockPagination,
      });

      const controller = contentApiController({ strapi: global.strapi as any });
      await controller.find(mockContext as Context);

      expect(mockUploadService.findPage).toHaveBeenCalledWith({});
      expect(mockContext.body).toEqual({
        data: mockFiles,
        meta: {
          pagination: mockPagination,
        },
      });
    });

    it('should support custom pageSize parameter', async () => {
      mockContext.query = {
        pagination: { pageSize: 2 },
      } as any;

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

      const controller = contentApiController({ strapi: global.strapi as any });
      await controller.find(mockContext as Context);

      expect(mockUploadService.findPage).toHaveBeenCalledWith({
        pagination: { pageSize: 2 },
      });
      expect((mockContext.body as any)?.meta.pagination.pageSize).toBe(2);
      expect((mockContext.body as any)?.data).toHaveLength(2);
    });

    it('should support page navigation with page parameter', async () => {
      mockContext.query = {
        pagination: { page: 2, pageSize: 2 },
      } as any;

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

      const controller = contentApiController({ strapi: global.strapi as any });
      await controller.find(mockContext as Context);

      expect(mockUploadService.findPage).toHaveBeenCalledWith({
        pagination: { page: 2, pageSize: 2 },
      });
      expect((mockContext.body as any)?.meta.pagination.page).toBe(2);
      expect((mockContext.body as any)?.data).toEqual(mockFiles);
    });

    it('should include withCount in pagination metadata when requested', async () => {
      mockContext.query = {
        pagination: { pageSize: 2, withCount: true },
      } as any;

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

      const controller = contentApiController({ strapi: global.strapi as any });
      await controller.find(mockContext as Context);

      expect((mockContext.body as any)?.meta.pagination).toHaveProperty('total');
      expect((mockContext.body as any)?.meta.pagination).toHaveProperty('pageCount');
    });

    it('should return empty array with pagination when no files exist', async () => {
      const mockPagination = {
        page: 1,
        pageSize: 25,
        pageCount: 0,
        total: 0,
      };

      mockUploadService.findPage.mockResolvedValue({
        results: [],
        pagination: mockPagination,
      });

      const controller = contentApiController({ strapi: global.strapi as any });
      await controller.find(mockContext as Context);

      expect(mockContext.body).toEqual({
        data: [],
        meta: {
          pagination: mockPagination,
        },
      });
    });

    it('should properly sanitize output before returning', async () => {
      const mockFiles = [{ id: 1, name: 'file1.jpg', secretField: 'secret' }];
      const sanitizedFiles = [{ id: 1, name: 'file1.jpg' }];
      const mockPagination = {
        page: 1,
        pageSize: 25,
        pageCount: 1,
        total: 1,
      };

      mockUploadService.findPage.mockResolvedValue({
        results: mockFiles,
        pagination: mockPagination,
      });
      mockSanitizeOutput.mockResolvedValue(sanitizedFiles);

      const controller = contentApiController({ strapi: global.strapi as any });
      await controller.find(mockContext as Context);

      // Sanitize output should be called with the files array
      expect(mockSanitizeOutput).toHaveBeenCalled();
      expect((mockContext.body as any)?.data).toEqual(sanitizedFiles);
      expect((mockContext.body as any)?.data[0]).not.toHaveProperty('secretField');
    });

    it('should validate query before processing', async () => {
      mockContext.query = {
        pagination: { pageSize: 100 },
        filters: { name: { $contains: 'test' } },
      } as any;

      mockUploadService.findPage.mockResolvedValue({
        results: [],
        pagination: { page: 1, pageSize: 100, pageCount: 0, total: 0 },
      });

      const controller = contentApiController({ strapi: global.strapi as any });
      await controller.find(mockContext as Context);

      // Validate should be called
      expect(mockValidateQuery).toHaveBeenCalled();
    });

    it('should sanitize query params before calling findPage', async () => {
      const unsanitizedQuery = {
        pagination: { pageSize: 10 },
        filters: { name: { $contains: 'test' } },
        populate: '*',
      };
      const sanitizedQuery = {
        pagination: { pageSize: 10 },
        filters: { name: { $contains: 'test' } },
      };

      mockContext.query = unsanitizedQuery as any;
      mockSanitizeQuery.mockResolvedValue(sanitizedQuery);
      mockUploadService.findPage.mockResolvedValue({
        results: [],
        pagination: { page: 1, pageSize: 10, pageCount: 0, total: 0 },
      });

      const controller = contentApiController({ strapi: global.strapi as any });
      await controller.find(mockContext as Context);

      // Sanitize should be called
      expect(mockSanitizeQuery).toHaveBeenCalled();
      expect(mockUploadService.findPage).toHaveBeenCalledWith(sanitizedQuery);
    });

    it('should handle very large page numbers gracefully', async () => {
      mockContext.query = {
        pagination: { page: 999, pageSize: 10 },
      } as any;

      const mockPagination = {
        page: 999,
        pageSize: 10,
        pageCount: 5,
        total: 50,
      };

      mockSanitizeQuery.mockResolvedValue({ pagination: { page: 999, pageSize: 10 } });
      mockUploadService.findPage.mockResolvedValue({
        results: [],
        pagination: mockPagination,
      });

      const controller = contentApiController({ strapi: global.strapi as any });
      await controller.find(mockContext as Context);

      expect(mockContext.body).toEqual({
        data: [],
        meta: {
          pagination: mockPagination,
        },
      });
    });

    it('should support custom page sizes up to maximum allowed', async () => {
      mockContext.query = {
        pagination: { pageSize: 100 },
      } as any;

      const mockFiles = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `file${i + 1}.jpg`,
      }));
      const mockPagination = {
        page: 1,
        pageSize: 100,
        pageCount: 3,
        total: 300,
      };

      mockSanitizeQuery.mockResolvedValue({ pagination: { pageSize: 100 } });
      mockUploadService.findPage.mockResolvedValue({
        results: mockFiles,
        pagination: mockPagination,
      });

      const controller = contentApiController({ strapi: global.strapi as any });
      await controller.find(mockContext as Context);

      expect((mockContext.body as any)?.data).toHaveLength(100);
      expect((mockContext.body as any)?.meta.pagination.pageSize).toBe(100);
    });

    it('should maintain backward compatibility with filters and sorting', async () => {
      mockContext.query = {
        pagination: { pageSize: 5 },
        filters: { mime: { $startsWith: 'image/' } },
        sort: 'createdAt:desc',
      } as any;

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

      const controller = contentApiController({ strapi: global.strapi as any });
      await controller.find(mockContext as Context);

      expect(mockUploadService.findPage).toHaveBeenCalledWith(sanitizedQuery);
      expect((mockContext.body as any)?.data).toHaveLength(1);
    });
  });
});
