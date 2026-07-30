import type { Context } from 'koa';

import contentApiController from '../content-api';
import { getService } from '../../utils';
import { validateUploadBody } from '../validation/content-api/upload';
import { prepareUploadRequest } from '../../utils/mime-validation';

jest.mock('../../utils');
jest.mock('../validation/content-api/upload');
jest.mock('../../utils/mime-validation', () => ({
  prepareUploadRequest: jest.fn(),
}));

const mockGetService = getService as jest.MockedFunction<typeof getService>;
const mockValidateUploadBody = validateUploadBody as jest.MockedFunction<typeof validateUploadBody>;
const mockPrepareUploadRequest = jest.mocked(prepareUploadRequest);

describe('Content API Controller - find / findPage', () => {
  let mockContext: Context;
  let mockUploadService: any;
  let mockFileService: any;
  let mockValidateQuery: jest.Mock;
  let mockSanitizeQuery: jest.Mock;
  let mockSanitizeOutput: jest.Mock;

  const buildController = () => contentApiController({ strapi: globalThis.strapi as any });

  beforeEach(() => {
    jest.clearAllMocks();

    mockUploadService = {
      findMany: jest.fn(),
      findPage: jest.fn(),
      findAndCountPage: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      replace: jest.fn(),
    };

    mockFileService = {
      signFileUrls: jest.fn((file) => Promise.resolve(file)),
    };

    mockGetService.mockImplementation((serviceName: string) => {
      if (serviceName === 'upload') return mockUploadService;
      if (serviceName === 'file') return mockFileService;
      return {};
    });

    mockValidateQuery = jest.fn().mockResolvedValue(undefined);
    mockSanitizeQuery = jest.fn((query) => Promise.resolve(query));
    mockSanitizeOutput = jest.fn((data) => Promise.resolve(data));
    mockValidateUploadBody.mockResolvedValue({
      fileInfo: {
        name: 'replacement.pdf',
        folder: null,
      },
    } as any);

    globalThis.strapi = {
      getModel: jest.fn().mockReturnValue({ uid: 'plugin::upload.file' }),
      contentAPI: {
        validate: { query: mockValidateQuery },
        sanitize: { query: mockSanitizeQuery, output: mockSanitizeOutput },
      },
    } as any;

    mockContext = {
      query: {} as any,
      state: { auth: {} },
      body: undefined,
      notFound: jest.fn(),
    } as unknown as Context;
  });

  describe('find - legacy flat-array endpoint (GET /files)', () => {
    it('returns a flat array and calls findMany (never findPage/findAndCountPage)', async () => {
      const mockFiles = [
        { id: 1, name: 'file1.jpg', url: '/uploads/file1.jpg' },
        { id: 2, name: 'file2.jpg', url: '/uploads/file2.jpg' },
      ];
      mockUploadService.findMany.mockResolvedValue(mockFiles);

      await buildController().find(mockContext);

      expect(mockUploadService.findMany).toHaveBeenCalledWith({});
      expect(mockUploadService.findPage).not.toHaveBeenCalled();
      expect(mockUploadService.findAndCountPage).not.toHaveBeenCalled();

      expect(mockContext.body).toEqual(mockFiles);
      expect(mockContext.body).not.toHaveProperty('data');
      expect(mockContext.body).not.toHaveProperty('meta');
    });

    it('keeps the flat-array shape even when pagination params are present', async () => {
      // The legacy endpoint must ignore pagination (current v5 behavior) — it does not
      // shape-shift. Pagination is only honored by the dedicated findPage handler.
      mockContext.query = { pagination: { pageSize: 2 } } as any;
      mockSanitizeQuery.mockResolvedValue({ pagination: { pageSize: 2 } });

      const mockFiles = [{ id: 1, name: 'file1.jpg' }];
      mockUploadService.findMany.mockResolvedValue(mockFiles);

      await buildController().find(mockContext);

      expect(mockUploadService.findMany).toHaveBeenCalledWith({ pagination: { pageSize: 2 } });
      expect(mockUploadService.findAndCountPage).not.toHaveBeenCalled();
      expect(Array.isArray(mockContext.body)).toBe(true);
      expect(mockContext.body).toEqual(mockFiles);
    });

    it('signs urls and sanitizes the output', async () => {
      const mockFiles = [{ id: 1, name: 'file1.jpg', secretField: 'secret' }];
      const sanitizedFiles = [{ id: 1, name: 'file1.jpg' }];

      mockUploadService.findMany.mockResolvedValue(mockFiles);
      mockSanitizeOutput.mockResolvedValue(sanitizedFiles);

      await buildController().find(mockContext);

      expect(mockFileService.signFileUrls).toHaveBeenCalledTimes(mockFiles.length);
      expect(mockSanitizeOutput).toHaveBeenCalled();
      expect(mockContext.body).toEqual(sanitizedFiles);
    });

    it('validates and sanitizes the query before hitting the service', async () => {
      mockContext.query = { filters: { name: { $contains: 'test' } } } as any;
      mockUploadService.findMany.mockResolvedValue([]);

      await buildController().find(mockContext);

      expect(mockValidateQuery).toHaveBeenCalled();
      expect(mockSanitizeQuery).toHaveBeenCalled();
    });
  });

  describe('findPage - paginated endpoint (GET /files/page)', () => {
    it('returns the { data, meta: { pagination } } envelope', async () => {
      mockContext.query = { pagination: { pageSize: 2 } } as any;

      const mockFiles = [
        { id: 1, name: 'file1.jpg' },
        { id: 2, name: 'file2.jpg' },
      ];
      const mockPagination = { page: 1, pageSize: 2, pageCount: 5, total: 10 };

      mockSanitizeQuery.mockResolvedValue({ pagination: { pageSize: 2 } });
      mockUploadService.findAndCountPage.mockResolvedValue({
        results: mockFiles,
        pagination: mockPagination,
      });

      await buildController().findPage(mockContext);

      expect(mockUploadService.findAndCountPage).toHaveBeenCalledWith({
        pagination: { pageSize: 2 },
      });
      expect(mockUploadService.findMany).not.toHaveBeenCalled();

      expect(mockContext.body).toEqual({
        data: mockFiles,
        meta: { pagination: mockPagination },
      });
    });

    it('passes pagination[page]/pagination[pageSize] through to the service', async () => {
      mockContext.query = { pagination: { page: 2, pageSize: 2 } } as any;

      const mockFiles = [
        { id: 3, name: 'file3.jpg' },
        { id: 4, name: 'file4.jpg' },
      ];
      mockSanitizeQuery.mockResolvedValue({ pagination: { page: 2, pageSize: 2 } });
      mockUploadService.findAndCountPage.mockResolvedValue({
        results: mockFiles,
        pagination: { page: 2, pageSize: 2, pageCount: 5, total: 10 },
      });

      await buildController().findPage(mockContext);

      expect(mockUploadService.findAndCountPage).toHaveBeenCalledWith({
        pagination: { page: 2, pageSize: 2 },
      });
      expect((mockContext.body as any)?.meta.pagination.page).toBe(2);
      expect((mockContext.body as any)?.data).toEqual(mockFiles);
    });

    it('forwards offset-based pagination meta unchanged (start/limit)', async () => {
      mockContext.query = { pagination: { start: 0, limit: 3 } } as any;
      mockSanitizeQuery.mockResolvedValue({ pagination: { start: 0, limit: 3 } });
      mockUploadService.findAndCountPage.mockResolvedValue({
        results: [],
        pagination: { start: 0, limit: 3, total: 10 },
      });

      await buildController().findPage(mockContext);

      expect((mockContext.body as any)?.meta.pagination).toEqual({
        start: 0,
        limit: 3,
        total: 10,
      });
    });

    it('forwards withCount-omitted pagination meta (no total/pageCount)', async () => {
      mockContext.query = { pagination: { pageSize: 2, withCount: false } } as any;
      mockSanitizeQuery.mockResolvedValue({ pagination: { pageSize: 2, withCount: false } });
      mockUploadService.findAndCountPage.mockResolvedValue({
        results: [{ id: 1, name: 'file1.jpg' }],
        pagination: { page: 1, pageSize: 2 },
      });

      await buildController().findPage(mockContext);

      const { pagination } = (mockContext.body as any).meta;
      expect(pagination).toEqual({ page: 1, pageSize: 2 });
      expect(pagination).not.toHaveProperty('total');
      expect(pagination).not.toHaveProperty('pageCount');
    });

    it('returns an empty data array with pagination when no files exist', async () => {
      mockContext.query = { pagination: { pageSize: 10 } } as any;
      const mockPagination = { page: 1, pageSize: 10, pageCount: 0, total: 0 };

      mockSanitizeQuery.mockResolvedValue({ pagination: { pageSize: 10 } });
      mockUploadService.findAndCountPage.mockResolvedValue({
        results: [],
        pagination: mockPagination,
      });

      await buildController().findPage(mockContext);

      expect(mockContext.body).toEqual({ data: [], meta: { pagination: mockPagination } });
    });

    it('sanitizes the output (drops private fields) in paginated mode', async () => {
      mockContext.query = { pagination: { pageSize: 5 } } as any;

      const mockFiles = [{ id: 1, name: 'file1.jpg', secretField: 'secret' }];
      const sanitizedFiles = [{ id: 1, name: 'file1.jpg' }];

      mockSanitizeQuery.mockResolvedValue({ pagination: { pageSize: 5 } });
      mockUploadService.findAndCountPage.mockResolvedValue({
        results: mockFiles,
        pagination: { page: 1, pageSize: 5, pageCount: 1, total: 1 },
      });
      mockSanitizeOutput.mockResolvedValue(sanitizedFiles);

      await buildController().findPage(mockContext);

      expect(mockSanitizeOutput).toHaveBeenCalled();
      expect(mockSanitizeOutput.mock.calls[0][0]).toEqual(mockFiles);
      expect((mockContext.body as any)?.data).toEqual(sanitizedFiles);
      expect((mockContext.body as any)?.data[0]).not.toHaveProperty('secretField');
    });

    it('preserves filters and sort alongside pagination', async () => {
      const sanitizedQuery = {
        pagination: { pageSize: 5 },
        filters: { mime: { $startsWith: 'image/' } },
        sort: 'createdAt:desc',
      };
      mockContext.query = sanitizedQuery as any;
      mockSanitizeQuery.mockResolvedValue(sanitizedQuery);
      mockUploadService.findAndCountPage.mockResolvedValue({
        results: [{ id: 1, name: 'image.jpg', mime: 'image/jpeg' }],
        pagination: { page: 1, pageSize: 5, pageCount: 1, total: 1 },
      });

      await buildController().findPage(mockContext);

      expect(mockUploadService.findAndCountPage).toHaveBeenCalledWith(sanitizedQuery);
      expect((mockContext.body as any)?.data).toHaveLength(1);
    });

    it('validates and sanitizes the query before hitting the service', async () => {
      mockContext.query = {
        pagination: { pageSize: 100 },
        filters: { name: { $contains: 'test' } },
      } as any;
      mockSanitizeQuery.mockResolvedValue({
        pagination: { pageSize: 100 },
        filters: { name: { $contains: 'test' } },
      });
      mockUploadService.findAndCountPage.mockResolvedValue({
        results: [],
        pagination: { page: 1, pageSize: 100, pageCount: 0, total: 0 },
      });

      await buildController().findPage(mockContext);

      expect(mockValidateQuery).toHaveBeenCalled();
      expect(mockSanitizeQuery).toHaveBeenCalled();
    });
  });

  describe('replaceFile', () => {
    it('accepts a single replacement file received as an array', async () => {
      const replacementFile = {
        filepath: '/tmp/replacement.pdf',
        originalFilename: 'replacement.pdf',
        mimetype: 'application/pdf',
      };

      mockContext.query = { id: '1' } as any;
      mockContext.request = {
        body: {
          fileInfo: ['{"name":"replacement.pdf","folder":null}'],
        },
        files: {
          files: [replacementFile],
        },
      } as any;

      mockPrepareUploadRequest.mockResolvedValue({
        validFiles: [replacementFile],
        filteredBody: {
          fileInfo: {
            name: 'replacement.pdf',
            folder: null,
          },
        },
        errors: [],
      });

      mockUploadService.replace.mockResolvedValue({
        id: 1,
        name: 'replacement.pdf',
      });

      await buildController().replaceFile(mockContext);

      expect(mockPrepareUploadRequest).toHaveBeenCalledWith(
        replacementFile,
        mockContext.request!.body,
        globalThis.strapi
      );
      expect(mockUploadService.replace).toHaveBeenCalledWith('1', {
        data: {
          fileInfo: {
            name: 'replacement.pdf',
            folder: null,
          },
        },
        file: replacementFile,
      });
      expect(mockContext.body).toEqual({
        id: 1,
        name: 'replacement.pdf',
      });
    });

    it('rejects multiple replacement files', async () => {
      mockContext.query = { id: '1' } as any;
      mockContext.request = {
        body: {},
        files: {
          files: [
            { filepath: '/tmp/first.jpg', originalFilename: 'first.jpg', mimetype: 'image/jpeg' },
            {
              filepath: '/tmp/second.jpg',
              originalFilename: 'second.jpg',
              mimetype: 'image/jpeg',
            },
          ],
        },
      } as any;

      await expect(buildController().replaceFile(mockContext)).rejects.toThrow(
        'Cannot replace a file with multiple ones'
      );

      expect(mockPrepareUploadRequest).not.toHaveBeenCalled();
      expect(mockUploadService.replace).not.toHaveBeenCalled();
    });
  });
});
