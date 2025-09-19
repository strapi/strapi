import type { Context } from 'koa';

import adminUploadController from '../admin-upload';
import { getService } from '../../utils';
import { validateUploadBody } from '../validation/admin/upload';

jest.mock('../../utils');
jest.mock('../validation/admin/upload');

const mockGetService = getService as jest.MockedFunction<typeof getService>;
const mockValidateUploadBody = validateUploadBody as jest.MockedFunction<typeof validateUploadBody>;

describe('Admin Upload Controller - AI Service Connection', () => {
  let mockContext: Partial<Context>;
  let mockAiMetadataService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAiMetadataService = {
      isEnabled: jest.fn(),
      processFiles: jest.fn(),
    };

    mockGetService.mockImplementation((serviceName: string) => {
      if (serviceName === 'aiMetadata') {
        return mockAiMetadataService;
      }
      return {
        upload: jest.fn().mockResolvedValue([{}]),
        signFileUrls: jest.fn((file) => Promise.resolve(file)),
      };
    });

    global.strapi = {
      service: jest.fn().mockReturnValue({
        createPermissionsManager: jest.fn().mockReturnValue({
          isAllowed: true,
          sanitizeOutput: jest.fn((data) => Promise.resolve(data)),
        }),
      }),
      admin: {
        services: {
          permission: {
            createPermissionsManager: jest.fn().mockReturnValue({
              isAllowed: true,
              sanitizeOutput: jest.fn((data) => Promise.resolve(data)),
            }),
          },
        },
      },
      log: {
        warn: jest.fn(),
      },
    } as any;

    mockContext = {
      state: {
        userAbility: {},
        user: { id: 1 },
      },
      request: {
        body: {},
        files: { files: { filepath: '/tmp/test.jpg', mimetype: 'image/jpeg' } },
      } as any,
      forbidden: jest.fn(),
    } as any;

    mockValidateUploadBody.mockResolvedValue({
      fileInfo: { name: 'test.jpg', alternativeText: '', caption: '', folder: null },
    } as any);
  });

  describe('uploadFiles - AI Service Connection', () => {
    it('should call AI processFiles when service is enabled', async () => {
      mockAiMetadataService.isEnabled.mockReturnValue(true);
      mockAiMetadataService.processFiles.mockResolvedValue([{}]);

      await adminUploadController.uploadFiles(mockContext as Context);

      expect(mockAiMetadataService.processFiles).toHaveBeenCalledWith([
        expect.objectContaining({
          filepath: '/tmp/test.jpg',
          mimetype: 'image/jpeg',
        }),
      ]);
    });

    it('should not call AI processFiles when service is disabled', async () => {
      mockAiMetadataService.isEnabled.mockReturnValue(false);

      await adminUploadController.uploadFiles(mockContext as Context);

      expect(mockAiMetadataService.processFiles).not.toHaveBeenCalled();
    });

    it('should handle AI service errors gracefully', async () => {
      mockAiMetadataService.isEnabled.mockReturnValue(true);
      mockAiMetadataService.processFiles.mockRejectedValue(new Error('AI service unavailable'));

      await adminUploadController.uploadFiles(mockContext as Context);

      expect(strapi.log.warn).toHaveBeenCalledWith(
        'AI metadata generation failed, proceeding without AI enhancements',
        { error: 'AI service unavailable' }
      );
    });
  });
});
