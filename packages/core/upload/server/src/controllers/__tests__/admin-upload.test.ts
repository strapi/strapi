import type { Context } from 'koa';

import adminUploadController from '../admin-upload';
import { getService } from '../../utils';
import { validateBulkUpdateBody, validateUploadBody } from '../validation/admin/upload';
import * as findEntityAndCheckPermissionsModule from '../utils/find-entity-and-check-permissions';
import { ACTIONS } from '../../../src/constants';

jest.mock('../../utils');
jest.mock('../validation/admin/upload');
jest.mock('../utils/find-entity-and-check-permissions');

const mockGetService = getService as jest.MockedFunction<typeof getService>;
const mockValidateUploadBody = validateUploadBody as jest.MockedFunction<typeof validateUploadBody>;
const mockValidateBulkUpdateBody = validateBulkUpdateBody as jest.MockedFunction<
  typeof validateBulkUpdateBody
>;
const mockFindEntityAndCheckPermissions =
  findEntityAndCheckPermissionsModule.findEntityAndCheckPermissions as jest.MockedFunction<
    typeof findEntityAndCheckPermissionsModule.findEntityAndCheckPermissions
  >;

describe('Admin Upload Controller', () => {
  let mockContext: Partial<Context>;
  let ctxBulk: Partial<Context>;

  let mockAiMetadataService: {
    isEnabled: jest.Mock;
    processFiles: jest.Mock;
  };

  let uploadService: {
    upload: jest.Mock;
    updateFileInfo: jest.Mock;
    replace: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockAiMetadataService = {
      isEnabled: jest.fn(),
      processFiles: jest.fn(),
    };

    uploadService = {
      upload: jest.fn().mockResolvedValue([{}]),
      updateFileInfo: jest.fn(),
      replace: jest.fn(),
    };

    mockGetService.mockImplementation((serviceName: string) => {
      if (serviceName === 'aiMetadata') return mockAiMetadataService as any;
      if (serviceName === 'upload') return uploadService as any;
      if (serviceName === 'file') {
        return {
          signFileUrls: jest.fn((f: any) => Promise.resolve(f)),
        } as any;
      }
      return {} as any;
    });

    const pm = {
      isAllowed: true,
      sanitizeOutput: jest.fn((data) => Promise.resolve(data)),
    };

    (global as any).strapi = {
      service: jest.fn().mockReturnValue({
        createPermissionsManager: jest.fn().mockReturnValue(pm),
      }),
      admin: {
        services: {
          permission: {
            createPermissionsManager: jest.fn().mockReturnValue(pm),
          },
        },
      },
      log: { warn: jest.fn() },
    } as any;

    // --- default validator behavior ---
    mockValidateUploadBody.mockResolvedValue({
      fileInfo: { name: 'test.jpg', alternativeText: '', caption: '', folder: null },
    } as any);

    mockValidateBulkUpdateBody.mockResolvedValue({
      updates: [],
    } as any);

    // By default, each permission check returns a pm with sanitizeOutput
    mockFindEntityAndCheckPermissions.mockResolvedValue({
      pm: {
        sanitizeOutput: jest.fn((data) => Promise.resolve({ ...data, cleaned: true })),
      },
    } as any);

    // --- contexts ---
    mockContext = {
      state: { userAbility: {}, user: { id: 1 } },
      request: {
        body: {},
        files: { files: { filepath: '/tmp/test.jpg', mimetype: 'image/jpeg' } },
      } as any,
      forbidden: jest.fn(),
    } as any;

    ctxBulk = {
      state: { userAbility: {}, user: { id: 42 } },
      request: { body: {} } as any,
    } as any;
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

  describe('bulkUpdateFileInfo', () => {
    it('updates multiple files, sanitizes outputs, and returns an array', async () => {
      mockValidateBulkUpdateBody.mockResolvedValue({
        updates: [
          {
            id: 1,
            fileInfo: {
              name: 'fileA.jpg',
              caption: 'A',
              alternativeText: 'alternativeA',
              folder: null,
            },
          },
          {
            id: 2,
            fileInfo: {
              name: 'fileB.jpg',
              alternativeText: 'alternativeB',
              caption: 'B',
              folder: null,
            },
          },
        ],
      });

      uploadService.updateFileInfo
        .mockResolvedValueOnce({ id: 1, caption: 'A' })
        .mockResolvedValueOnce({ id: 2, alternativeText: 'B' });

      await adminUploadController.bulkUpdateFileInfo(ctxBulk as Context);

      expect(mockValidateBulkUpdateBody).toHaveBeenCalledWith({});
      expect(uploadService.updateFileInfo).toHaveBeenNthCalledWith(
        1,
        1,
        { name: 'fileA.jpg', alternativeText: 'alternativeA', caption: 'A', folder: null },
        { user: { id: 42 } }
      );
      expect(uploadService.updateFileInfo).toHaveBeenNthCalledWith(
        2,
        2,
        { name: 'fileB.jpg', alternativeText: 'alternativeB', caption: 'B', folder: null },
        { user: { id: 42 } }
      );

      expect(mockFindEntityAndCheckPermissions).toHaveBeenCalledTimes(2);

      expect((ctxBulk as any).body).toEqual([
        { id: 1, caption: 'A', cleaned: true },
        { id: 2, alternativeText: 'B', cleaned: true },
      ]);
    });

    it('returns an empty array when no updates provided', async () => {
      mockValidateBulkUpdateBody.mockResolvedValue({ updates: [] });

      await adminUploadController.bulkUpdateFileInfo(ctxBulk as Context);

      expect((ctxBulk as any).body).toEqual([]);
      expect(uploadService.updateFileInfo).not.toHaveBeenCalled();
      expect(mockFindEntityAndCheckPermissions).not.toHaveBeenCalled();
    });

    it('propagates validation errors from validateBulkUpdateBody', async () => {
      mockValidateBulkUpdateBody.mockRejectedValue(new Error('Invalid payload'));

      await expect(adminUploadController.bulkUpdateFileInfo(ctxBulk as Context)).rejects.toThrow(
        'Invalid payload'
      );
    });

    it('sanitizes each updated entity with ACTIONS.read', async () => {
      const sanitizeOutput = jest.fn((data) => Promise.resolve({ ok: true, ...data }));
      mockFindEntityAndCheckPermissions.mockResolvedValue({ pm: { sanitizeOutput } } as any);

      mockValidateBulkUpdateBody.mockResolvedValue({
        updates: [
          {
            id: 10,
            fileInfo: {
              name: 'fileA.jpg',
              caption: 'X',
              alternativeText: 'alternativeA',
              folder: null,
            },
          },
        ],
      });

      uploadService.updateFileInfo.mockResolvedValue({ id: 10, caption: 'X' });

      await adminUploadController.bulkUpdateFileInfo(ctxBulk as Context);

      expect(sanitizeOutput).toHaveBeenCalledWith(
        { id: 10, caption: 'X' },
        { action: ACTIONS.read }
      );
      expect((ctxBulk as any).body).toEqual([{ ok: true, id: 10, caption: 'X' }]);
    });

    it('passes the authenticated user to updateFileInfo', async () => {
      mockValidateBulkUpdateBody.mockResolvedValue({
        updates: [
          {
            id: 7,
            fileInfo: {
              name: 'fileA.jpg',
              alternativeText: 'hello',
              caption: 'A',
            },
          },
        ],
      } as any);

      uploadService.updateFileInfo.mockResolvedValue({ id: 7 });

      await adminUploadController.bulkUpdateFileInfo(ctxBulk as Context);

      expect(uploadService.updateFileInfo).toHaveBeenCalledWith(
        7,
        { name: 'fileA.jpg', alternativeText: 'hello', caption: 'A' },
        { user: { id: 42 } }
      );
    });
  });
});
