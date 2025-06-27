import { getService } from '../../utils';
import uploadServiceFactory from '../upload';

jest.mock('../../utils');

describe('Upload Service | URL Signing', () => {
  let uploadService: any;
  let mockSignFileUrls: jest.Mock;
  let mockDbQuery: jest.Mock;
  let mockGetQueryParams: jest.Mock;

  const mockFile = {
    id: 1,
    url: 'original-url.jpg',
    provider: 'aws-s3',
  };

  const mockSignedFile = {
    id: 1,
    url: 'signed-url.jpg',
    provider: 'aws-s3',
    isUrlSigned: true,
  };

  beforeEach(() => {
    mockSignFileUrls = jest.fn().mockResolvedValue(mockSignedFile);
    mockDbQuery = jest.fn();
    mockGetQueryParams = jest.fn().mockReturnValue({
      transform: jest.fn().mockReturnValue({}),
    });

    jest.mocked(getService).mockImplementation((serviceName: string) => {
      if (serviceName === 'file') {
        return {
          signFileUrls: mockSignFileUrls,
          getFolderPath: jest.fn(),
          deleteByIds: jest.fn(),
        };
      }
      return {
        formatFileInfo: jest.fn(),
        getFolderPath: jest.fn(),
        deleteByIds: jest.fn(),
        signFileUrls: jest.fn(),
      } as any;
    });

    global.strapi = {
      db: {
        query: jest.fn().mockReturnValue({
          findOne: mockDbQuery,
          findMany: mockDbQuery,
          findPage: mockDbQuery,
        }),
      },
      get: jest.fn((key: string) => {
        if (key === 'query-params') {
          return mockGetQueryParams();
        }
        return undefined;
      }),
    } as any;

    uploadService = uploadServiceFactory({ strapi: global.strapi });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should sign URLs for found files', async () => {
      mockDbQuery.mockResolvedValue(mockFile);

      const result = await uploadService.findOne(1);

      expect(mockDbQuery).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockSignFileUrls).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual(mockSignedFile);
    });

    it('should return null when file not found', async () => {
      mockDbQuery.mockResolvedValue(null);

      const result = await uploadService.findOne(999);

      expect(mockDbQuery).toHaveBeenCalled();
      expect(mockSignFileUrls).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should pass populate parameters correctly', async () => {
      mockDbQuery.mockResolvedValue(mockFile);
      const populate = { folder: true };

      await uploadService.findOne(1, populate);

      expect(mockGetQueryParams().transform).toHaveBeenCalledWith('plugin::upload.file', {
        populate,
      });
    });
  });

  describe('findMany', () => {
    const mockFiles = [
      { id: 1, url: 'file1.jpg' },
      { id: 2, url: 'file2.jpg' },
    ];

    const mockSignedFiles = [
      { id: 1, url: 'signed-file1.jpg', isUrlSigned: true },
      { id: 2, url: 'signed-file2.jpg', isUrlSigned: true },
    ];

    it('should sign URLs for all found files', async () => {
      mockDbQuery.mockResolvedValue(mockFiles);
      mockSignFileUrls
        .mockResolvedValueOnce(mockSignedFiles[0])
        .mockResolvedValueOnce(mockSignedFiles[1]);

      const result = await uploadService.findMany({ limit: 10 });

      expect(mockDbQuery).toHaveBeenCalled();
      expect(mockSignFileUrls).toHaveBeenCalledTimes(2);
      expect(mockSignFileUrls).toHaveBeenNthCalledWith(1, mockFiles[0]);
      expect(mockSignFileUrls).toHaveBeenNthCalledWith(2, mockFiles[1]);
      expect(result).toEqual(mockSignedFiles);
    });

    it('should handle empty results', async () => {
      mockDbQuery.mockResolvedValue([]);

      const result = await uploadService.findMany();

      expect(mockDbQuery).toHaveBeenCalled();
      expect(mockSignFileUrls).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should get file service only once for multiple files', async () => {
      mockDbQuery.mockResolvedValue(mockFiles);
      mockSignFileUrls
        .mockResolvedValueOnce(mockSignedFiles[0])
        .mockResolvedValueOnce(mockSignedFiles[1]);

      await uploadService.findMany();

      // Verify getService was called only once despite multiple files
      expect(getService).toHaveBeenCalledTimes(1);
      expect(getService).toHaveBeenCalledWith('file');
    });
  });

  describe('findPage', () => {
    const mockPageResult = {
      results: [
        { id: 1, url: 'file1.jpg' },
        { id: 2, url: 'file2.jpg' },
      ],
      pagination: {
        page: 1,
        pageSize: 25,
        pageCount: 1,
        total: 2,
      },
    };

    const mockSignedFiles = [
      { id: 1, url: 'signed-file1.jpg', isUrlSigned: true },
      { id: 2, url: 'signed-file2.jpg', isUrlSigned: true },
    ];

    it('should sign URLs for paginated results', async () => {
      mockDbQuery.mockResolvedValue(mockPageResult);
      mockSignFileUrls
        .mockResolvedValueOnce(mockSignedFiles[0])
        .mockResolvedValueOnce(mockSignedFiles[1]);

      const result = await uploadService.findPage({ page: 1, pageSize: 25 });

      expect(mockDbQuery).toHaveBeenCalled();
      expect(mockSignFileUrls).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        ...mockPageResult,
        results: mockSignedFiles,
      });
    });

    it('should preserve pagination metadata', async () => {
      mockDbQuery.mockResolvedValue(mockPageResult);
      mockSignFileUrls
        .mockResolvedValueOnce(mockSignedFiles[0])
        .mockResolvedValueOnce(mockSignedFiles[1]);

      const result = await uploadService.findPage();

      expect(result.pagination).toEqual(mockPageResult.pagination);
    });

    it('should handle empty page results', async () => {
      const emptyPageResult = {
        results: [],
        pagination: {
          page: 1,
          pageSize: 25,
          pageCount: 0,
          total: 0,
        },
      };
      mockDbQuery.mockResolvedValue(emptyPageResult);

      const result = await uploadService.findPage();

      expect(mockSignFileUrls).not.toHaveBeenCalled();
      expect(result).toEqual(emptyPageResult);
    });

    it('should get file service only once for multiple files', async () => {
      mockDbQuery.mockResolvedValue(mockPageResult);
      mockSignFileUrls
        .mockResolvedValueOnce(mockSignedFiles[0])
        .mockResolvedValueOnce(mockSignedFiles[1]);

      await uploadService.findPage();

      // Verify getService was called only once despite multiple files
      expect(getService).toHaveBeenCalledTimes(1);
      expect(getService).toHaveBeenCalledWith('file');
    });
  });

  describe('error handling', () => {
    it('should handle signFileUrls errors gracefully', async () => {
      mockDbQuery.mockResolvedValue(mockFile);
      mockSignFileUrls.mockRejectedValue(new Error('Signing failed'));

      await expect(uploadService.findOne(1)).rejects.toThrow('Signing failed');
    });

    it('should handle database errors', async () => {
      mockDbQuery.mockRejectedValue(new Error('Database error'));

      await expect(uploadService.findOne(1)).rejects.toThrow('Database error');
    });
  });
});
