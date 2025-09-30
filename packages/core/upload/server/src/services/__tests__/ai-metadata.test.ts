import { readFile } from 'node:fs/promises';
import { createAIMetadataService } from '../ai-metadata';
import type { InputFile } from '../../types';

// Mock dependencies
jest.mock('node:fs/promises');
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

const mockGetSettings = jest.fn();

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

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
      ee: {
        isEE: true,
      },
      service: jest.fn().mockReturnValue({
        getAiToken: jest.fn().mockResolvedValue({ token: 'mock-token' }),
      }),
      log: {
        http: jest.fn(),
        warn: jest.fn(),
      },
      plugin: jest.fn().mockImplementation((pluginName) => {
        if (pluginName === 'upload') {
          return {
            service: jest.fn().mockImplementation((serviceName) => {
              if (serviceName === 'upload') {
                return { getSettings: mockGetSettings };
              }
              // ...other services if needed
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
    delete process.env.STRAPI_ADMIN_AI_URL;
  });

  describe('isEnabled', () => {
    it('should return true when AI is enabled and EE is available', async () => {
      mockGetSettings.mockResolvedValue({ aiMetadata: true });
      mockStrapi.ee.isEE = true;

      expect(await aiMetadataService.isEnabled()).toBe(true);
      expect(mockGetSettings).toHaveBeenCalled();
    });

    it('should return false when AI is disabled but EE is available', async () => {
      mockGetSettings.mockResolvedValue({ aiMetadata: false });
      mockStrapi.ee.isEE = true;

      expect(await aiMetadataService.isEnabled()).toBe(false);
    });

    it('should return false when AI is enabled but EE is not available', async () => {
      mockGetSettings.mockResolvedValue({ aiMMetadata: true });
      mockStrapi.ee.isEE = false;

      expect(await aiMetadataService.isEnabled()).toBe(false);
    });

    it('should return false when both AI and EE are disabled', async () => {
      mockGetSettings.mockResolvedValue({ aiMetadata: false });
      mockStrapi.ee.isEE = false;

      expect(await aiMetadataService.isEnabled()).toBe(false);
    });
  });

  describe('processFiles', () => {
    const mockImageFile: InputFile = {
      filepath: '/tmp/image.jpg',
      mimetype: 'image/jpeg',
      originalFilename: 'image.jpg',
      size: 1024,
    } as InputFile;

    const mockPdfFile: InputFile = {
      filepath: '/tmp/document.pdf',
      mimetype: 'application/pdf',
      originalFilename: 'document.pdf',
      size: 2048,
    } as InputFile;

    beforeEach(() => {
      // Mock service as enabled by default
      mockGetSettings.mockResolvedValue({ aiMetadata: true });
      mockStrapi.ee.isEE = true;

      // Mock readFile to return proper Buffer with .buffer property
      const mockBuffer = Buffer.from('image-data');
      mockReadFile.mockResolvedValue(mockBuffer);
    });

    describe('error cases', () => {
      it('should throw error when service is disabled', async () => {
        mockGetSettings.mockResolvedValue({ aiMetadata: false });

        await expect(aiMetadataService.processFiles([mockImageFile])).rejects.toThrow(
          'AI Metadata service is not enabled'
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
          json: jest.fn().mockResolvedValue({
            results: [expectedMetadata],
          }),
        } as any);

        const result = await aiMetadataService.processFiles([mockImageFile]);

        expect(result).toEqual([expectedMetadata]);
        expect(mockReadFile).toHaveBeenCalledWith('/tmp/image.jpg');
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
        const mockImageFile2: InputFile = {
          filepath: '/tmp/image2.png',
          mimetype: 'image/png',
          originalFilename: 'image2.png',
          size: 2048,
        } as InputFile;

        const expectedMetadata = [
          { altText: 'First image', caption: 'First caption' },
          { altText: 'Second image', caption: 'Second caption' },
        ];

        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: expectedMetadata,
          }),
        } as any);

        const result = await aiMetadataService.processFiles([mockImageFile, mockImageFile2]);

        expect(result).toEqual(expectedMetadata);
        expect(mockReadFile).toHaveBeenCalledTimes(2);
      });

      it('should handle mixed file types with correct sparse array mapping', async () => {
        const mockImageFile2: InputFile = {
          filepath: '/tmp/image2.png',
          mimetype: 'image/png',
          originalFilename: 'image2.png',
          size: 2048,
        } as InputFile;

        const expectedMetadata = [
          { altText: 'First image', caption: 'First caption' },
          { altText: 'Second image', caption: 'Second caption' },
        ];

        mockFetch.mockResolvedValue({
          ok: true,
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
    });
  });
});
