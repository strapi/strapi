import type { Context } from 'koa';

import createContentApiController from '../content-api';
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

describe('Content API Upload Controller', () => {
  const strapiMock = {
    getModel: jest.fn(() => ({})),
    contentAPI: {
      sanitize: {
        output: jest.fn((data) => Promise.resolve(data)),
        query: jest.fn((data) => Promise.resolve(data)),
      },
      validate: {
        query: jest.fn(() => Promise.resolve()),
      },
    },
  } as any;

  let controller: ReturnType<typeof createContentApiController>;
  let uploadService: {
    replace: jest.Mock;
  };
  let fileService: {
    signFileUrls: jest.Mock;
  };
  let ctx: Partial<Context>;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = createContentApiController({ strapi: strapiMock });
    uploadService = {
      replace: jest.fn(),
    };
    fileService = {
      signFileUrls: jest.fn((file) => Promise.resolve(file)),
    };

    mockGetService.mockImplementation(((serviceName: string) => {
      if (serviceName === 'upload') {
        return uploadService;
      }
      if (serviceName === 'file') {
        return fileService;
      }

      return {};
    }) as any);

    mockValidateUploadBody.mockResolvedValue({
      fileInfo: {
        name: 'replacement.pdf',
        folder: null,
      },
    } as any);

    ctx = {
      query: { id: '1' },
      state: { auth: {}, route: {} },
      request: {
        body: {},
        files: {},
      } as any,
    } as any;
  });

  describe('replaceFile', () => {
    it('accepts a single replacement file received as an array', async () => {
      const replacementFile = {
        filepath: '/tmp/replacement.pdf',
        originalFilename: 'replacement.pdf',
        mimetype: 'application/pdf',
      };

      ctx.request!.body = {
        fileInfo: ['{"name":"replacement.pdf","folder":null}'],
      };
      ctx.request!.files = { files: [replacementFile] } as any;

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

      uploadService.replace.mockResolvedValue({
        id: 1,
        name: 'replacement.pdf',
      });

      await controller.replaceFile(ctx as Context);

      expect(mockPrepareUploadRequest).toHaveBeenCalledWith(
        replacementFile,
        ctx.request!.body,
        strapiMock
      );
      expect(uploadService.replace).toHaveBeenCalledWith('1', {
        data: {
          fileInfo: {
            name: 'replacement.pdf',
            folder: null,
          },
        },
        file: replacementFile,
      });
      expect(ctx.body).toEqual({
        id: 1,
        name: 'replacement.pdf',
      });
    });

    it('rejects multiple replacement files', async () => {
      ctx.request!.files = {
        files: [
          { filepath: '/tmp/first.jpg', originalFilename: 'first.jpg', mimetype: 'image/jpeg' },
          { filepath: '/tmp/second.jpg', originalFilename: 'second.jpg', mimetype: 'image/jpeg' },
        ],
      } as any;

      await expect(controller.replaceFile(ctx as Context)).rejects.toThrow(
        'Cannot replace a file with multiple ones'
      );

      expect(mockPrepareUploadRequest).not.toHaveBeenCalled();
      expect(uploadService.replace).not.toHaveBeenCalled();
    });
  });
});
