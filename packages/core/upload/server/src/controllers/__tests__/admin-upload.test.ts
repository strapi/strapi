import type { Context } from 'koa';

import { errors } from '@strapi/utils';
import adminUploadController from '../admin-upload';
import { getService } from '../../utils';
import { validateBulkUpdateBody, validateUploadBody } from '../validation/admin/upload';
import * as findEntityAndCheckPermissionsModule from '../utils/find-entity-and-check-permissions';
import { ACTIONS } from '../../constants';
import { prepareUploadRequest } from '../../utils/mime-validation';

jest.mock('../../utils/mime-validation', () => ({
  prepareUploadRequest: jest.fn(() => ({
    validFiles: [{ originalFilename: 'test.jpg', mimetype: 'image/jpeg' }],
    filteredBody: {},
  })),
}));

jest.mock('../../utils');
jest.mock('../validation/admin/upload');
jest.mock('../utils/find-entity-and-check-permissions');
const mockPrepareUploadRequest = jest.mocked(prepareUploadRequest);

const mockGetService = getService as jest.MockedFunction<typeof getService>;
const mockValidateUploadBody = validateUploadBody as jest.MockedFunction<typeof validateUploadBody>;
const mockValidateBulkUpdateBody = validateBulkUpdateBody as jest.MockedFunction<
  typeof validateBulkUpdateBody
>;
const mockFindEntityAndCheckPermissions =
  findEntityAndCheckPermissionsModule.findEntityAndCheckPermissions as jest.MockedFunction<
    typeof findEntityAndCheckPermissionsModule.findEntityAndCheckPermissions
  >;

describe('Admin Upload Controller - AI Service Connection', () => {
  let mockContext: Partial<Context>;
  let ctxBulk: Partial<Context>;

  let mockAiMetadataService: any;

  let uploadService: {
    upload: jest.Mock;
    updateFileInfo: jest.Mock;
    replace: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrepareUploadRequest.mockResolvedValue({
      validFiles: [{ originalFilename: 'test.jpg', mimetype: 'image/jpeg' }],
      filteredBody: {},
    });

    mockAiMetadataService = {
      isEnabled: jest.fn(),
      processFiles: jest.fn(),
      updateFilesWithAIMetadata: jest.fn().mockResolvedValue(undefined),
    };

    uploadService = {
      upload: jest.fn().mockResolvedValue([{}]),
      updateFileInfo: jest.fn(),
      replace: jest.fn(),
    };

    mockGetService.mockImplementation((serviceName: string) => {
      if (serviceName === 'aiMetadata') return mockAiMetadataService;
      if (serviceName === 'upload') return uploadService;
      if (serviceName === 'file') {
        return {
          upload: jest.fn().mockResolvedValue([{}]),
          signFileUrls: jest.fn((file) => Promise.resolve(file)),
        };
      }
      if (serviceName === 'metrics') {
        return {
          trackUsage: jest.fn().mockResolvedValue(undefined),
        };
      }
      return {};
    });

    const pm = {
      isAllowed: true,
      sanitizeOutput: jest.fn((data) => Promise.resolve(data)),
    };

    global.strapi = {
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
      telemetry: { send: jest.fn() },
    } as any;

    mockValidateUploadBody.mockResolvedValue({
      fileInfo: {
        name: 'test.jpg',
        alternativeText: '',
        caption: '',
        focalPoint: null,
        folder: null,
      },
    });

    mockValidateBulkUpdateBody.mockResolvedValue({
      updates: [],
    });

    mockFindEntityAndCheckPermissions.mockResolvedValue({
      pm: {
        sanitizeOutput: jest.fn((data) => Promise.resolve({ ...data, cleaned: true })),
      },
    } as any);

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
      request: { body: {} },
    } as any;
  });

  describe('uploadFiles - Security Filtering', () => {
    it('should call enforceUploadSecurity with uploaded files', async () => {
      const files = [
        {
          originalFilename: 'test1.jpg',
          mimetype: 'image/jpeg',
          size: 12345,
          filepath: '/tmp/test1.jpg',
          newFilename: 'test1.jpg',
          hashAlgorithm: 'sha256' as const,
          length: 12345,
          mtime: new Date(),
          toJSON() {
            return {
              originalFilename: this.originalFilename,
              mimetype: this.mimetype,
              size: this.size,
              filepath: this.filepath,
              newFilename: this.newFilename,
              hashAlgorithm: this.hashAlgorithm,
              length: this.length,
              mtime: this.mtime,
            };
          },
        },
        {
          originalFilename: 'test2.pdf',
          mimetype: 'application/pdf',
          size: 23456,
          filepath: '/tmp/test2.pdf',
          newFilename: 'test2.pdf',
          hashAlgorithm: 'sha256' as const,
          length: 23456,
          mtime: new Date(),
          toJSON() {
            return {
              originalFilename: this.originalFilename,
              mimetype: this.mimetype,
              size: this.size,
              filepath: this.filepath,
              newFilename: this.newFilename,
              hashAlgorithm: this.hashAlgorithm,
              length: this.length,
              mtime: this.mtime,
            };
          },
        },
      ];

      mockContext.request!.files = { files };

      await adminUploadController.uploadFiles(mockContext as Context);

      expect(mockPrepareUploadRequest).toHaveBeenCalledWith(files, {}, strapi);
    });

    it('should throw ValidationError when no valid files remain after security check', async () => {
      mockPrepareUploadRequest.mockRejectedValue(
        new errors.ValidationError('MIME type not allowed', {})
      );

      await expect(adminUploadController.uploadFiles(mockContext as Context)).rejects.toThrow(
        errors.ValidationError
      );
    });

    it('should filter fileInfo array when some files are rejected by security', async () => {
      mockPrepareUploadRequest.mockResolvedValue({
        validFiles: [{ originalFilename: 'allowed.jpg', mimetype: 'image/jpeg' }],
        filteredBody: {
          fileInfo: '{"name":"allowed.jpg","folder":null}',
        },
      });

      mockContext.request!.body = {
        fileInfo: ['{"name":"blocked.pdf","folder":null}', '{"name":"allowed.jpg","folder":null}'],
      };

      mockValidateUploadBody.mockResolvedValue({
        fileInfo: {
          name: 'allowed.jpg',
          folder: null,
          alternativeText: '',
          caption: '',
          focalPoint: null,
        },
      });

      await adminUploadController.uploadFiles(mockContext as Context);

      expect(mockValidateUploadBody).toHaveBeenCalledWith(
        {
          fileInfo: '{"name":"allowed.jpg","folder":null}',
        },
        false
      );
    });

    it('should handle single file being filtered correctly', async () => {
      mockPrepareUploadRequest.mockResolvedValue({
        validFiles: [{ originalFilename: 'test.jpg', mimetype: 'image/jpeg' }],
        filteredBody: {
          fileInfo: '{"name":"test.jpg","folder":null}',
        },
      });

      mockContext.request!.body = {
        fileInfo: ['{"name":"test.jpg","folder":null}'],
      };

      mockValidateUploadBody.mockResolvedValue({
        fileInfo: {
          name: 'test.jpg',
          folder: null,
          alternativeText: '',
          caption: '',
          focalPoint: null,
        },
      });

      await adminUploadController.uploadFiles(mockContext as Context);

      expect(mockValidateUploadBody).toHaveBeenCalledWith(
        {
          fileInfo: '{"name":"test.jpg","folder":null}',
        },
        false
      );
    });

    it('should handle multiple files remaining after filtering', async () => {
      mockPrepareUploadRequest.mockResolvedValue({
        validFiles: [
          { originalFilename: 'file1.jpg', mimetype: 'image/jpeg' },
          { originalFilename: 'file2.png', mimetype: 'image/png' },
        ],
        filteredBody: {
          fileInfo: [
            { name: 'file1.jpg', folder: null, caption: '', alternativeText: '' },
            { name: 'file2.png', folder: null, caption: '', alternativeText: '' },
          ],
        },
      });

      mockContext.request!.body = {
        fileInfo: [
          { name: 'file1.jpg', alternativeText: '', caption: '', focalPoint: null, folder: null },
          { name: 'file2.png', alternativeText: '', caption: '', focalPoint: null, folder: null },
        ],
      };

      mockValidateUploadBody.mockResolvedValue({
        fileInfo: [
          { name: 'file1.jpg', alternativeText: '', caption: '', focalPoint: null, folder: null },
          { name: 'file2.png', alternativeText: '', caption: '', focalPoint: null, folder: null },
        ],
      });

      await adminUploadController.uploadFiles(mockContext as Context);

      expect(mockValidateUploadBody).toHaveBeenCalledWith(
        {
          fileInfo: [
            { name: 'file1.jpg', folder: null, caption: '', alternativeText: '' },
            { name: 'file2.png', folder: null, caption: '', alternativeText: '' },
          ],
        },
        true
      );
    });

    it('should align filesArray with filtered fileInfo data', async () => {
      const validFiles = [
        { originalFilename: 'file1.jpg', mimetype: 'image/jpeg' },
        { originalFilename: 'file2.png', mimetype: 'image/png' },
      ];

      mockPrepareUploadRequest.mockResolvedValue({
        validFiles,
        filteredBody: {},
      });

      mockValidateUploadBody.mockResolvedValue({
        fileInfo: [
          { name: 'file2.png', alternativeText: '', caption: '', focalPoint: null, folder: null },
          { name: 'file1.jpg', alternativeText: '', caption: '', focalPoint: null, folder: null },
        ],
      });

      await adminUploadController.uploadFiles(mockContext as Context);

      expect(uploadService.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          files: expect.arrayContaining([
            expect.objectContaining({ originalFilename: 'file2.png' }),
            expect.objectContaining({ originalFilename: 'file1.jpg' }),
          ]),
          data: expect.objectContaining({
            fileInfo: expect.arrayContaining([
              expect.objectContaining({ name: 'file2.png' }),
              expect.objectContaining({ name: 'file1.jpg' }),
            ]),
          }),
        }),
        expect.any(Object)
      );
    });

    it('should handle non-array fileInfo body correctly', async () => {
      mockPrepareUploadRequest.mockResolvedValue({
        validFiles: [{ originalFilename: 'single.jpg', mimetype: 'image/jpeg' }],
        filteredBody: {
          fileInfo: '{"name":"single.jpg","folder":null}',
        },
      });

      mockContext.request!.body = {
        fileInfo: '{"name":"single.jpg","folder":null}',
      };

      mockValidateUploadBody.mockResolvedValue({
        fileInfo: {
          name: 'single.jpg',
          folder: null,
          alternativeText: '',
          caption: '',
          focalPoint: null,
        },
      });

      await adminUploadController.uploadFiles(mockContext as Context);

      expect(mockValidateUploadBody).toHaveBeenCalledWith(
        {
          fileInfo: '{"name":"single.jpg","folder":null}',
        },
        false
      );
    });

    it('should throw ValidationError when no valid files after filtering', async () => {
      mockPrepareUploadRequest.mockRejectedValue(
        new errors.ValidationError('File size exceeds limit', {
          fileSize: 10000000,
          maxFileSize: 1000000,
        })
      );

      await expect(adminUploadController.uploadFiles(mockContext as Context)).rejects.toThrow(
        'File size exceeds limit'
      );
    });
  });

  describe('uploadFiles - AI Service Connection', () => {
    it('should call AI processFiles when service is enabled', async () => {
      mockAiMetadataService.isEnabled.mockReturnValue(true);
      mockAiMetadataService.processFiles.mockResolvedValue([{}]);

      uploadService.upload.mockResolvedValue([
        {
          id: 1,
          name: 'test.jpg',
          mime: 'image/jpeg',
          url: '/uploads/test.jpg',
          provider: 'local',
        },
      ]);

      await adminUploadController.uploadFiles(mockContext as Context);

      expect(mockAiMetadataService.processFiles).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 1,
          name: 'test.jpg',
          url: '/uploads/test.jpg',
          mime: 'image/jpeg',
          provider: 'local',
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

    it('should update files with AI metadata when available', async () => {
      mockAiMetadataService.isEnabled.mockReturnValue(true);
      mockAiMetadataService.processFiles.mockResolvedValue([
        { altText: 'AI generated alt text', caption: 'AI generated caption' },
      ]);

      const uploadedFiles = [
        {
          id: 1,
          name: 'test.jpg',
          mime: 'image/jpeg',
          url: '/uploads/test.jpg',
          provider: 'local',
        },
      ];

      uploadService.upload.mockResolvedValue(uploadedFiles);

      await adminUploadController.uploadFiles(mockContext as Context);

      expect(mockAiMetadataService.updateFilesWithAIMetadata).toHaveBeenCalledWith(
        uploadedFiles,
        [{ altText: 'AI generated alt text', caption: 'AI generated caption' }],
        { id: 1 }
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
              focalPoint: null,
              folder: null,
            },
          },
          {
            id: 2,
            fileInfo: {
              name: 'fileB.jpg',
              alternativeText: 'alternativeB',
              caption: 'B',
              focalPoint: null,
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
        {
          name: 'fileA.jpg',
          alternativeText: 'alternativeA',
          caption: 'A',
          focalPoint: null,
          folder: null,
        },
        { user: { id: 42 } }
      );
      expect(uploadService.updateFileInfo).toHaveBeenNthCalledWith(
        2,
        2,
        {
          name: 'fileB.jpg',
          alternativeText: 'alternativeB',
          caption: 'B',
          focalPoint: null,
          folder: null,
        },
        { user: { id: 42 } }
      );

      expect(mockFindEntityAndCheckPermissions).toHaveBeenCalledTimes(2);

      expect(ctxBulk.body).toEqual([
        { id: 1, caption: 'A', cleaned: true },
        { id: 2, alternativeText: 'B', cleaned: true },
      ]);
    });

    it('returns an empty array when no updates provided', async () => {
      mockValidateBulkUpdateBody.mockResolvedValue({ updates: [] });

      await adminUploadController.bulkUpdateFileInfo(ctxBulk as Context);

      expect(ctxBulk.body).toEqual([]);
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
              focalPoint: null,
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
      expect(ctxBulk.body).toEqual([{ ok: true, id: 10, caption: 'X' }]);
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
              focalPoint: null,
              folder: null,
            },
          },
        ],
      });

      uploadService.updateFileInfo.mockResolvedValue({ id: 7 });

      await adminUploadController.bulkUpdateFileInfo(ctxBulk as Context);

      expect(uploadService.updateFileInfo).toHaveBeenCalledWith(
        7,
        {
          name: 'fileA.jpg',
          alternativeText: 'hello',
          caption: 'A',
          focalPoint: null,
          folder: null,
        },
        { user: { id: 42 } }
      );
    });
  });
});
