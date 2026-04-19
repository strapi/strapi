import { readFile } from 'node:fs/promises';
import { createAIMetadataService } from '../ai-metadata';
import type { File } from '../../types';

// Mock dependencies
jest.mock('node:fs/promises');
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

const mockGetSettings = jest.fn();

// Mock fetch globally
const mockArrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));

const mockFetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  arrayBuffer: mockArrayBuffer, // Add this
  json: jest.fn().mockResolvedValue({
    results: [{ altText: 'image alt', caption: 'image caption' }],
  }),
  text: jest.fn().mockResolvedValue(''),
  headers: {
    get: jest.fn().mockReturnValue('image/jpeg'),
  },
} as any);

global.fetch = mockFetch;

// Mock FormData
global.FormData = jest.fn().mockImplementation(() => ({
  append: jest.fn(),
}));

// Mock Blob
global.Blob = jest.fn().mockImplementation((parts, options) => ({
  parts,
  type: options?.type,
}));

describe('AI Metadata Service', () => {
  let mockStrapi: any;
  let aiMetadataService: ReturnType<typeof createAIMetadataService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStrapi = {
      config: {
        get: jest.fn(),
      },
      ai: {
        admin: {
          isEnabled: jest.fn().mockReturnValue(true),
          getAiToken: jest.fn().mockResolvedValue({ token: 'mock-token' }),
        },
      },
      log: {
        http: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
      },
      plugin: jest.fn().mockImplementation((pluginName) => {
        if (pluginName === 'upload') {
          return {
            service: jest.fn().mockImplementation((serviceName) => {
              if (serviceName === 'upload') {
                return { getSettings: mockGetSettings };
              }
              return {};
            }),
          };
        }
        return {};
      }),
    };

    process.env.STRAPI_AI_URL = 'https://ai.strapi.com';

    aiMetadataService = createAIMetadataService({ strapi: mockStrapi });
  });

  afterEach(() => {
    delete process.env.STRAPI_AI_URL;
  });

  describe('isEnabled', () => {
    it('should return true when strapi.ai.admin.isEnabled() is true and aiMetadata is true', async () => {
      mockStrapi.ai.admin.isEnabled.mockReturnValue(true);
      mockGetSettings.mockResolvedValue({ aiMetadata: true });

      expect(await aiMetadataService.isEnabled()).toBe(true);
      expect(mockGetSettings).toHaveBeenCalled();
    });

    it('should return false when strapi.ai.admin.isEnabled() is false', async () => {
      mockStrapi.ai.admin.isEnabled.mockReturnValue(false);

      expect(await aiMetadataService.isEnabled()).toBe(false);
      expect(mockGetSettings).not.toHaveBeenCalled();
    });

    it('should return false when strapi.ai.admin.isEnabled() is true but aiMetadata is false', async () => {
      mockStrapi.ai.admin.isEnabled.mockReturnValue(true);
      mockGetSettings.mockResolvedValue({ aiMetadata: false });

      expect(await aiMetadataService.isEnabled()).toBe(false);
    });

    it('should default aiMetadata to true when not set in settings', async () => {
      mockStrapi.ai.admin.isEnabled.mockReturnValue(true);
      mockGetSettings.mockResolvedValue({});

      expect(await aiMetadataService.isEnabled()).toBe(true);
    });
  });

  describe('processFiles', () => {
    const mockImageFile: File = {
      id: 1,
      name: 'image.jpg',
      url: '/tmp/image.jpg',
      mime: 'image/jpeg',
      size: 1024,
      provider: 'local',
      hash: 'hash1',
    } as File;

    const mockImageFile2: File = {
      id: 2,
      name: 'image2.png',
      url: 'image2.png',
      mime: 'image/png',
      size: 2048,
      provider: 'cloudinary',
      hash: 'hash2',
    } as File;

    const mockPdfFile: File = {
      id: 3,
      name: 'document.pdf',
      url: '/tmp/document.pdf',
      mime: 'application/pdf',
      size: 2048,
      provider: 'local',
      hash: 'hash3',
    } as File;

    beforeEach(() => {
      mockStrapi.config.get.mockImplementation((key: string) => {
        if (key === 'server.absoluteUrl') return 'test-url';
        if (key === 'server.port') return 1337;
        return undefined;
      });

      // Mock service as enabled by default
      mockStrapi.ai.admin.isEnabled.mockReturnValue(true);
      mockGetSettings.mockResolvedValue({ aiMetadata: true });

      const mockBuffer = Buffer.from('image-data');
      mockReadFile.mockResolvedValue(mockBuffer);
    });

    describe('error cases', () => {
      it('should throw error when service is disabled', async () => {
        mockStrapi.ai.admin.isEnabled.mockReturnValue(false);

        await expect(aiMetadataService.processFiles([mockImageFile])).rejects.toThrow(
          'AI Metadata service is not enabled'
        );
      });

      it('should throw if getSettings throws an error', async () => {
        mockStrapi.ai.admin.isEnabled.mockReturnValue(true);
        mockGetSettings.mockRejectedValue(new Error('Settings error'));

        const files = [mockImageFile, mockPdfFile, mockImageFile2, mockPdfFile];

        await expect(aiMetadataService.processFiles(files)).rejects.toThrow('Settings error');
      });

      it('should throw when getAiToken fails (fail-fast)', async () => {
        mockStrapi.ai.admin.isEnabled.mockReturnValue(true);
        mockGetSettings.mockResolvedValue({ aiMetadata: true });
        mockStrapi.ai.admin.getAiToken.mockRejectedValue(new Error('token error'));

        await expect(aiMetadataService.processFiles([mockImageFile])).rejects.toThrow(
          'Failed to retrieve AI token'
        );
      });
    });

    describe('non-image file handling', () => {
      it('should return array of nulls for non-image files', async () => {
        const result = await aiMetadataService.processFiles([mockPdfFile]);

        expect(result).toEqual([null]);
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should return proper sparse array for mixed file types', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          arrayBuffer: mockArrayBuffer,
          json: jest.fn().mockResolvedValue({
            results: [{ altText: 'image alt', caption: 'image caption' }],
          }),
        } as any);

        const files = [mockPdfFile, mockImageFile, mockPdfFile];
        const result = await aiMetadataService.processFiles(files);

        expect(result).toEqual([null, { altText: 'image alt', caption: 'image caption' }, null]);
      });
    });

    describe('image file processing', () => {
      it('should process single image file correctly', async () => {
        const expectedMetadata = { altText: 'A beautiful image', caption: 'Image caption' };

        mockFetch.mockResolvedValue({
          ok: true,
          arrayBuffer: mockArrayBuffer,
          json: jest.fn().mockResolvedValue({
            results: [expectedMetadata],
          }),
        } as any);

        const result = await aiMetadataService.processFiles([mockImageFile]);

        expect(result).toEqual([expectedMetadata]);
        expect(mockFetch).toHaveBeenCalledWith('test-url/tmp/image.jpg');
        expect(mockFetch).toHaveBeenCalledWith(
          'https://ai.strapi.com/media-library/generate-metadata',
          {
            method: 'POST',
            body: expect.any(Object),
            headers: {
              Authorization: 'Bearer mock-token',
            },
          }
        );
      });

      it('should process multiple image files correctly', async () => {
        const expectedMetadata = [
          { altText: 'First image', caption: 'First caption' },
          { altText: 'Second image', caption: 'Second caption' },
        ];

        mockFetch.mockResolvedValue({
          ok: true,
          arrayBuffer: mockArrayBuffer,
          json: jest.fn().mockResolvedValue({
            results: expectedMetadata,
          }),
        } as any);

        const result = await aiMetadataService.processFiles([mockImageFile, mockImageFile2]);

        expect(result).toEqual(expectedMetadata);
        expect(mockFetch).toHaveBeenCalledTimes(3); // 2 files + 1 AI service call
        expect(mockFetch).toHaveBeenCalledWith('test-url/tmp/image.jpg');
        expect(mockFetch).toHaveBeenCalledWith('image2.png');
      });

      it('should handle mixed file types with correct sparse array mapping', async () => {
        const expectedMetadata = [
          { altText: 'First image', caption: 'First caption' },
          { altText: 'Second image', caption: 'Second caption' },
        ];

        mockFetch.mockResolvedValue({
          ok: true,
          arrayBuffer: mockArrayBuffer,
          json: jest.fn().mockResolvedValue({
            results: expectedMetadata,
          }),
        } as any);

        // Order: image, pdf, image, pdf
        const files = [mockImageFile, mockPdfFile, mockImageFile2, mockPdfFile];
        const result = await aiMetadataService.processFiles(files);

        expect(result).toEqual([
          expectedMetadata[0], // first image
          null, // pdf
          expectedMetadata[1], // second image
          null, // pdf
        ]);
      });

      it('should not call fetch and throw if aiMetadata is false', async () => {
        mockStrapi.ai.admin.isEnabled.mockReturnValue(true);
        mockGetSettings.mockResolvedValue({ aiMetadata: false });

        const files = [mockImageFile, mockPdfFile, mockImageFile2, mockPdfFile];

        await expect(aiMetadataService.processFiles(files)).rejects.toThrow(
          'AI Metadata service is not enabled'
        );
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });
  });

  describe('updateFilesWithAIMetadata', () => {
    const mockUpdateFileInfo = jest.fn().mockResolvedValue({});

    beforeEach(() => {
      mockUpdateFileInfo.mockClear();

      // Mock the upload service with updateFileInfo method
      mockStrapi.plugin = jest.fn().mockImplementation((pluginName) => {
        if (pluginName === 'upload') {
          return {
            service: jest.fn().mockImplementation((serviceName) => {
              if (serviceName === 'upload') {
                return {
                  getSettings: mockGetSettings,
                  updateFileInfo: mockUpdateFileInfo,
                };
              }
              return {};
            }),
          };
        }
        return {};
      });

      // Recreate service with updated mock
      aiMetadataService = createAIMetadataService({ strapi: mockStrapi });
    });

    it('should only update caption when alternativeText exists', async () => {
      const files: File[] = [
        {
          id: 1,
          name: 'image.jpg',
          url: '/tmp/image.jpg',
          mime: 'image/jpeg',
          size: 1024,
          provider: 'local',
          hash: 'hash1',
          alternativeText: 'Existing alt text',
          caption: '', // Empty caption
        } as File,
      ];

      const metadataResults = [{ altText: 'AI generated alt', caption: 'AI generated caption' }];

      await aiMetadataService.updateFilesWithAIMetadata(files, metadataResults, {
        id: 1,
      });

      expect(mockUpdateFileInfo).toHaveBeenCalledTimes(1);
      expect(mockUpdateFileInfo).toHaveBeenCalledWith(
        1,
        { caption: 'AI generated caption' }, // Only caption should be updated
        { user: { id: 1 } }
      );

      expect(files[0].caption).toBe('AI generated caption');
      expect(files[0].alternativeText).toBe('Existing alt text'); // Should remain unchanged
    });

    it('should only update alternativeText when caption exists', async () => {
      const files: File[] = [
        {
          id: 2,
          name: 'image.jpg',
          url: '/tmp/image.jpg',
          mime: 'image/jpeg',
          size: 1024,
          provider: 'local',
          hash: 'hash2',
          alternativeText: null, // No alt text
          caption: 'Existing caption',
        } as File,
      ];

      const metadataResults = [{ altText: 'AI generated alt', caption: 'AI generated caption' }];

      await aiMetadataService.updateFilesWithAIMetadata(files, metadataResults, {
        id: 1,
      });

      expect(mockUpdateFileInfo).toHaveBeenCalledTimes(1);
      expect(mockUpdateFileInfo).toHaveBeenCalledWith(
        2,
        { alternativeText: 'AI generated alt' }, // Only alternativeText should be updated
        { user: { id: 1 } }
      );

      expect(files[0].alternativeText).toBe('AI generated alt');
      expect(files[0].caption).toBe('Existing caption'); // Should remain unchanged
    });

    it('should update both fields when neither exists', async () => {
      const files: File[] = [
        {
          id: 3,
          name: 'image.jpg',
          url: '/tmp/image.jpg',
          mime: 'image/jpeg',
          size: 1024,
          provider: 'local',
          hash: 'hash3',
          alternativeText: null,
          caption: null,
        } as File,
      ];

      const metadataResults = [{ altText: 'AI generated alt', caption: 'AI generated caption' }];

      await aiMetadataService.updateFilesWithAIMetadata(files, metadataResults, {
        id: 1,
      });

      expect(mockUpdateFileInfo).toHaveBeenCalledTimes(1);
      expect(mockUpdateFileInfo).toHaveBeenCalledWith(
        3,
        { alternativeText: 'AI generated alt', caption: 'AI generated caption' }, // Both fields
        { user: { id: 1 } }
      );
      expect(files[0].alternativeText).toBe('AI generated alt');
      expect(files[0].caption).toBe('AI generated caption');
    });

    it('should skip update when both fields already exist', async () => {
      const files: File[] = [
        {
          id: 4,
          name: 'image.jpg',
          url: '/tmp/image.jpg',
          mime: 'image/jpeg',
          size: 1024,
          provider: 'local',
          hash: 'hash4',
          alternativeText: 'Existing alt text',
          caption: 'Existing caption',
        } as File,
      ];

      const metadataResults = [{ altText: 'AI generated alt', caption: 'AI generated caption' }];

      await aiMetadataService.updateFilesWithAIMetadata(files, metadataResults, {
        id: 1,
      });

      expect(mockUpdateFileInfo).not.toHaveBeenCalled(); // Should not update at all
      expect(files[0].alternativeText).toBe('Existing alt text'); // Should remain unchanged
      expect(files[0].caption).toBe('Existing caption'); // Should remain unchanged
    });

    it('should treat empty strings as missing fields', async () => {
      const files: File[] = [
        {
          id: 5,
          name: 'image.jpg',
          url: '/tmp/image.jpg',
          mime: 'image/jpeg',
          size: 1024,
          provider: 'local',
          hash: 'hash5',
          alternativeText: '',
          caption: '',
        } as File,
      ];

      const metadataResults = [{ altText: 'AI generated alt', caption: 'AI generated caption' }];

      await aiMetadataService.updateFilesWithAIMetadata(files, metadataResults, {
        id: 1,
      });

      expect(mockUpdateFileInfo).toHaveBeenCalledTimes(1);
      expect(mockUpdateFileInfo).toHaveBeenCalledWith(
        5,
        { alternativeText: 'AI generated alt', caption: 'AI generated caption' },
        { user: { id: 1 } }
      );
    });

    it('should handle multiple files with different metadata states', async () => {
      const files: File[] = [
        {
          id: 1,
          name: 'image1.jpg',
          alternativeText: 'Existing alt',
          caption: '',
        } as File,
        {
          id: 2,
          name: 'image2.jpg',
          alternativeText: null,
          caption: 'Existing caption',
        } as File,
        {
          id: 3,
          name: 'image3.jpg',
          alternativeText: 'Has both',
          caption: 'Has both',
        } as File,
        {
          id: 4,
          name: 'image4.jpg',
          alternativeText: null,
          caption: null,
        } as File,
      ];

      const metadataResults = [
        { altText: 'Alt 1', caption: 'Caption 1' },
        { altText: 'Alt 2', caption: 'Caption 2' },
        { altText: 'Alt 3', caption: 'Caption 3' },
        { altText: 'Alt 4', caption: 'Caption 4' },
      ];

      await aiMetadataService.updateFilesWithAIMetadata(files, metadataResults, {
        id: 1,
      });

      expect(mockUpdateFileInfo).toHaveBeenCalledTimes(3); // File 3 should be skipped
      expect(mockUpdateFileInfo).toHaveBeenNthCalledWith(
        1,
        1,
        { caption: 'Caption 1' },
        { user: { id: 1 } }
      );
      expect(mockUpdateFileInfo).toHaveBeenNthCalledWith(
        2,
        2,
        { alternativeText: 'Alt 2' },
        { user: { id: 1 } }
      );
      expect(mockUpdateFileInfo).toHaveBeenNthCalledWith(
        3,
        4,
        { alternativeText: 'Alt 4', caption: 'Caption 4' },
        { user: { id: 1 } }
      );
    });
  });
});
