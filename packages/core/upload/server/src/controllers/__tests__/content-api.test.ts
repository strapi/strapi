import type { Context } from 'koa';

import { errors } from '@strapi/utils';

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
      updateFileInfo: jest.fn(),
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
      config: { get: jest.fn() },
      contentAPI: {
        validate: { query: mockValidateQuery },
        sanitize: { query: mockSanitizeQuery, output: mockSanitizeOutput },
        // The caller of these tests carries no data rules: API token, Users & Permissions, admin
        permissions: {
          checker: {
            isActive: jest.fn().mockReturnValue(false),
            fieldsFor: jest.fn().mockReturnValue({ always: null, conditional: [] }),
          },
          assertEntry: jest.fn(),
        },
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

  describe('strict query sanitization', () => {
    it.each(['find', 'findPage', 'findOne'] as const)(
      '%s sanitizes the query with strictParams so unknown root keys (e.g. `where`) are dropped',
      async (handler) => {
        const route = { method: 'GET', path: '/files' };
        mockContext.query = { where: { name: 'file.png' } } as any;
        mockContext.params = { id: '1' };
        (mockContext.state as any).route = route;
        mockUploadService.findMany.mockResolvedValue([]);
        mockUploadService.findAndCountPage.mockResolvedValue({ results: [], pagination: {} });
        mockUploadService.findOne.mockResolvedValue(null);

        await buildController()[handler](mockContext);

        expect(mockSanitizeQuery).toHaveBeenCalledWith(
          mockContext.query,
          { uid: 'plugin::upload.file' },
          { auth: {}, route, strictParams: true }
        );
      }
    );

    it.each(['find', 'findPage', 'findOne'] as const)(
      '%s validates leniently when api.rest.strictParams is not set',
      async (handler) => {
        const route = { method: 'GET', path: '/files' };
        mockContext.query = {} as any;
        mockContext.params = { id: '1' };
        (mockContext.state as any).route = route;
        mockUploadService.findMany.mockResolvedValue([]);
        mockUploadService.findAndCountPage.mockResolvedValue({ results: [], pagination: {} });
        mockUploadService.findOne.mockResolvedValue({ id: 1 });

        await buildController()[handler](mockContext);

        expect((globalThis.strapi as any).config.get).toHaveBeenCalledWith('api.rest.strictParams');
        expect(mockValidateQuery).toHaveBeenCalledWith(
          mockContext.query,
          { uid: 'plugin::upload.file' },
          { auth: {}, route }
        );
      }
    );

    it.each([true, false])(
      'passes api.rest.strictParams=%s through to validate',
      async (strictParams) => {
        const route = { method: 'GET', path: '/files' };
        mockContext.query = {} as any;
        (mockContext.state as any).route = route;
        (globalThis.strapi as any).config.get.mockReturnValue(strictParams);
        mockUploadService.findMany.mockResolvedValue([]);

        await buildController().find(mockContext);

        expect(mockValidateQuery).toHaveBeenCalledWith(
          mockContext.query,
          { uid: 'plugin::upload.file' },
          { auth: {}, route, strictParams }
        );
      }
    );
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

  describe('findOne / destroy - by numeric id or documentId (GET/DELETE /files/:id)', () => {
    let mockDbFindOne: jest.Mock;

    const file = { id: 7, documentId: 'qovkpekciob2wt8qyd51mg8k', name: 'image.jpg' };

    beforeEach(() => {
      mockDbFindOne = jest.fn();
      (globalThis.strapi as any).db = {
        query: jest.fn().mockReturnValue({ findOne: mockDbFindOne }),
      };
    });

    it('findOne passes a numeric id straight to the service without a documentId lookup', async () => {
      mockContext.params = { id: '7' };
      mockUploadService.findOne.mockResolvedValue(file);

      await buildController().findOne(mockContext);

      expect(mockDbFindOne).not.toHaveBeenCalled();
      expect(mockUploadService.findOne).toHaveBeenCalledWith('7', undefined);
      expect(mockContext.body).toEqual(file);
    });

    it('findOne resolves a documentId to the numeric id', async () => {
      mockContext.params = { id: file.documentId };
      mockDbFindOne.mockResolvedValue({ id: file.id });
      mockUploadService.findOne.mockResolvedValue(file);

      await buildController().findOne(mockContext);

      expect(globalThis.strapi.db.query).toHaveBeenCalledWith('plugin::upload.file');
      expect(mockDbFindOne).toHaveBeenCalledWith({
        where: { documentId: file.documentId },
        select: ['id'],
      });
      expect(mockUploadService.findOne).toHaveBeenCalledWith(file.id, undefined);
      expect(mockContext.body).toEqual(file);
    });

    it('findOne treats a digit-leading documentId as a documentId', async () => {
      mockContext.params = { id: '1abcdefghijklmnopqrstuvw' };
      mockDbFindOne.mockResolvedValue({ id: file.id });
      mockUploadService.findOne.mockResolvedValue(file);

      await buildController().findOne(mockContext);

      expect(mockDbFindOne).toHaveBeenCalledWith({
        where: { documentId: '1abcdefghijklmnopqrstuvw' },
        select: ['id'],
      });
      expect(mockUploadService.findOne).toHaveBeenCalledWith(file.id, undefined);
    });

    it('findOne returns notFound for an unknown documentId', async () => {
      mockContext.params = { id: 'unknowndocumentid0000000' };
      mockDbFindOne.mockResolvedValue(null);

      await buildController().findOne(mockContext);

      expect(mockUploadService.findOne).not.toHaveBeenCalled();
      expect(mockContext.notFound).toHaveBeenCalledWith('file.notFound');
    });

    it('findOne returns notFound for an unknown numeric id', async () => {
      mockContext.params = { id: '999' };
      mockUploadService.findOne.mockResolvedValue(null);

      await buildController().findOne(mockContext);

      expect(mockUploadService.findOne).toHaveBeenCalledWith('999', undefined);
      expect(mockContext.notFound).toHaveBeenCalledWith('file.notFound');
    });

    it('destroy passes a numeric id straight to the service without a documentId lookup', async () => {
      mockContext.params = { id: '7' };
      mockUploadService.findOne.mockResolvedValue(file);

      await buildController().destroy(mockContext);

      expect(mockDbFindOne).not.toHaveBeenCalled();
      expect(mockUploadService.findOne).toHaveBeenCalledWith('7');
      expect(mockUploadService.remove).toHaveBeenCalledWith(file);
      expect(mockContext.body).toEqual(file);
    });

    it('destroy resolves a documentId to the numeric id and removes the file', async () => {
      mockContext.params = { id: file.documentId };
      mockDbFindOne.mockResolvedValue({ id: file.id });
      mockUploadService.findOne.mockResolvedValue(file);

      await buildController().destroy(mockContext);

      expect(mockDbFindOne).toHaveBeenCalledWith({
        where: { documentId: file.documentId },
        select: ['id'],
      });
      expect(mockUploadService.findOne).toHaveBeenCalledWith(file.id);
      expect(mockUploadService.remove).toHaveBeenCalledWith(file);
      expect(mockContext.body).toEqual(file);
    });

    it('destroy treats a digit-leading documentId as a documentId', async () => {
      mockContext.params = { id: '1abcdefghijklmnopqrstuvw' };
      mockDbFindOne.mockResolvedValue({ id: file.id });
      mockUploadService.findOne.mockResolvedValue(file);

      await buildController().destroy(mockContext);

      expect(mockDbFindOne).toHaveBeenCalledWith({
        where: { documentId: '1abcdefghijklmnopqrstuvw' },
        select: ['id'],
      });
      expect(mockUploadService.findOne).toHaveBeenCalledWith(file.id);
      expect(mockUploadService.remove).toHaveBeenCalledWith(file);
    });

    it('destroy returns notFound for an unknown documentId and removes nothing', async () => {
      mockContext.params = { id: 'unknowndocumentid0000000' };
      mockDbFindOne.mockResolvedValue(null);

      await buildController().destroy(mockContext);

      expect(mockUploadService.findOne).not.toHaveBeenCalled();
      expect(mockUploadService.remove).not.toHaveBeenCalled();
      expect(mockContext.notFound).toHaveBeenCalledWith('file.notFound');
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

  describe('updateFileInfo / replaceFile - by documentId (POST /upload?id=)', () => {
    let mockDbFindOne: jest.Mock;

    const file = { id: 7, documentId: 'qovkpekciob2wt8qyd51mg8k', name: 'image.jpg' };
    const replacementFile = {
      filepath: '/tmp/replacement.pdf',
      originalFilename: 'replacement.pdf',
      mimetype: 'application/pdf',
    };

    beforeEach(() => {
      mockDbFindOne = jest.fn();
      (globalThis.strapi as any).db = {
        query: jest.fn().mockReturnValue({ findOne: mockDbFindOne }),
      };

      mockPrepareUploadRequest.mockResolvedValue({
        validFiles: [replacementFile],
        filteredBody: { fileInfo: { name: 'replacement.pdf', folder: null } },
        errors: [],
      });
    });

    it('updateFileInfo resolves a documentId to the numeric id', async () => {
      mockContext.query = { id: file.documentId } as any;
      mockContext.request = { body: {} } as any;
      mockDbFindOne.mockResolvedValue({ id: file.id });
      mockUploadService.updateFileInfo.mockResolvedValue(file);

      await buildController().updateFileInfo(mockContext);

      expect(mockDbFindOne).toHaveBeenCalledWith({
        where: { documentId: file.documentId },
        select: ['id'],
      });
      expect(mockUploadService.updateFileInfo).toHaveBeenCalledWith(file.id, {
        name: 'replacement.pdf',
        folder: null,
      });
      expect(mockContext.body).toEqual(file);
    });

    it('updateFileInfo throws NotFoundError for an unknown documentId', async () => {
      mockContext.query = { id: 'unknowndocumentid0000000' } as any;
      mockContext.request = { body: {} } as any;
      mockDbFindOne.mockResolvedValue(null);

      await expect(buildController().updateFileInfo(mockContext)).rejects.toMatchObject({
        name: 'NotFoundError',
      });
      expect(mockUploadService.updateFileInfo).not.toHaveBeenCalled();
    });

    it('replaceFile resolves a documentId to the numeric id', async () => {
      mockContext.query = { id: file.documentId } as any;
      mockContext.request = { body: {}, files: { files: replacementFile } } as any;
      mockDbFindOne.mockResolvedValue({ id: file.id });
      mockUploadService.replace.mockResolvedValue(file);

      await buildController().replaceFile(mockContext);

      expect(mockDbFindOne).toHaveBeenCalledWith({
        where: { documentId: file.documentId },
        select: ['id'],
      });
      expect(mockUploadService.replace).toHaveBeenCalledWith(file.id, {
        data: { fileInfo: { name: 'replacement.pdf', folder: null } },
        file: replacementFile,
      });
      expect(mockContext.body).toEqual(file);
    });

    it('replaceFile throws NotFoundError for an unknown documentId and replaces nothing', async () => {
      mockContext.query = { id: 'unknowndocumentid0000000' } as any;
      mockContext.request = { body: {}, files: { files: replacementFile } } as any;
      mockDbFindOne.mockResolvedValue(null);

      await expect(buildController().replaceFile(mockContext)).rejects.toMatchObject({
        name: 'NotFoundError',
      });
      expect(mockUploadService.replace).not.toHaveBeenCalled();
    });
  });

  describe('a caller whose permissions carry data rules (end-users)', () => {
    const NOTE = 'api::note.note';
    const noteModel = {
      uid: NOTE,
      modelType: 'contentType',
      attributes: { title: { type: 'string' }, cover: { type: 'media' } },
    };
    const uploaded = [{ id: 3, name: 'a.png' }];
    const png = { filepath: '/tmp/a.png', originalFilename: 'a.png', mimetype: 'image/png' };
    let assertEntry: jest.Mock;
    let can: jest.Mock;

    const upload = (body: Record<string, unknown>) => {
      mockContext.query = {} as any;
      mockContext.request = { body, files: { files: png } } as any;

      return buildController().upload(mockContext);
    };

    beforeEach(() => {
      const permissions = (globalThis.strapi as any).contentAPI.permissions;

      permissions.checker.isActive.mockReturnValue(true);
      assertEntry = permissions.assertEntry.mockResolvedValue(undefined);
      can = jest.fn().mockReturnValue(true);
      mockContext.state = { auth: { ability: { can } } } as any;

      (globalThis.strapi as any).getModel = jest.fn((uid: string) =>
        uid === NOTE ? noteModel : { uid: 'plugin::upload.file' }
      );
      (globalThis.strapi as any).db = { query: jest.fn() };

      mockPrepareUploadRequest.mockImplementation(async (_files: any, body: any) => ({
        validFiles: [png],
        filteredBody: body,
        errors: [],
      }));
      mockGetService.mockImplementation((serviceName: string) => {
        if (serviceName === 'upload')
          return { ...mockUploadService, upload: jest.fn().mockResolvedValue(uploaded) };
        if (serviceName === 'file') return mockFileService;
        if (serviceName === 'api-upload-folder') {
          return { getAPIUploadFolder: jest.fn().mockResolvedValue({ id: 1 }) };
        }
        return {};
      });
    });

    it('links a file to an entry the caller may update, on every locale, and uploads it', async () => {
      await upload({ ref: NOTE, refId: 'abc123', field: 'cover' });

      expect(can).toHaveBeenCalledWith(`${NOTE}.update`);
      expect(assertEntry).toHaveBeenCalledWith(mockContext.state.auth, 'update', NOTE, 'abc123', {
        locale: '*',
      });
      expect(mockContext.status).toBe(201);
    });

    it('refuses the link unless every row of the entry gives the caller the field', async () => {
      const { checker } = (globalThis.strapi as any).contentAPI.permissions;
      const owned = { owner: { documentId: 'me' } };
      const count = jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        '$or' in where ? 1 : 2
      );

      (globalThis.strapi as any).db = { query: jest.fn().mockReturnValue({ count }) };

      // Not among the fields every entry gets: only the conditioned row gives it
      checker.fieldsFor.mockReturnValue({
        always: ['title'],
        conditional: [{ filter: owned, fields: ['cover'] }],
      });

      // Two rows (a draft and a published version, or two locales), one of which matches
      await expect(upload({ ref: NOTE, refId: 'abc123', field: 'cover' })).rejects.toThrow(
        errors.ForbiddenError
      );
      expect(count).toHaveBeenCalledWith({ where: { documentId: 'abc123' } });
      expect(count).toHaveBeenCalledWith({ where: { documentId: 'abc123', $or: [owned] } });

      // Both rows match
      count.mockImplementation(async () => 2);
      await upload({ ref: NOTE, refId: 'abc123', field: 'cover' });

      expect(mockContext.status).toBe(201);

      // No conditioned row gives the field at all: nothing is counted
      count.mockClear();
      checker.fieldsFor.mockReturnValue({
        always: ['title'],
        conditional: [{ filter: owned, fields: ['summary'] }],
      });

      await expect(upload({ ref: NOTE, refId: 'abc123', field: 'cover' })).rejects.toThrow(
        errors.ForbiddenError
      );
      expect(count).not.toHaveBeenCalled();

      checker.fieldsFor.mockReturnValue({ always: null, conditional: [] });
    });

    it('uploads a file with no link without asking for an entry', async () => {
      await upload({});

      expect(assertEntry).not.toHaveBeenCalled();
      expect(mockContext.status).toBe(201);
    });

    it('refuses the link when the entry check refuses, and uploads nothing', async () => {
      assertEntry.mockRejectedValue(new errors.NotFoundError('Not Found'));

      await expect(upload({ ref: NOTE, refId: 'abc123', field: 'cover' })).rejects.toMatchObject({
        name: 'NotFoundError',
      });
      expect(mockContext.status).not.toBe(201);
    });

    it.each([
      ['ref only', { ref: NOTE }],
      ['a field that is not a media attribute', { ref: NOTE, refId: 'abc123', field: 'title' }],
      ['an unknown field', { ref: NOTE, refId: 'abc123', field: 'nope' }],
      ['a ref that is no content type', { ref: 'api::none.none', refId: 'abc123', field: 'cover' }],
      ['a numeric refId', { ref: NOTE, refId: '12', field: 'cover' }],
      ['a list as refId', { ref: NOTE, refId: ['a', 'b'], field: 'cover' }],
    ])('refuses %s with a validation error', async (_label, body) => {
      await expect(upload(body)).rejects.toMatchObject({ name: 'ValidationError' });
      expect(assertEntry).not.toHaveBeenCalled();
    });

    it('refuses the link when the caller has no update route on the type', async () => {
      can.mockReturnValue(false);

      await expect(upload({ ref: NOTE, refId: 'abc123', field: 'cover' })).rejects.toMatchObject({
        name: 'ForbiddenError',
      });
      expect(assertEntry).not.toHaveBeenCalled();
    });

    it('refuses updating and replacing a file by id', async () => {
      mockContext.query = { id: '5' } as any;
      mockContext.request = { body: {} } as any;

      await expect(buildController().upload(mockContext)).rejects.toMatchObject({
        name: 'ForbiddenError',
      });

      mockContext.request = { body: {}, files: { files: png } } as any;

      await expect(buildController().upload(mockContext)).rejects.toMatchObject({
        name: 'ForbiddenError',
      });
      expect(mockUploadService.updateFileInfo).not.toHaveBeenCalled();
      expect(mockUploadService.replace).not.toHaveBeenCalled();
    });
    it('refuses deleting a file by id, by numeric id or documentId, and removes nothing', async () => {
      mockContext.params = { id: '7' };

      await expect(buildController().destroy(mockContext)).rejects.toMatchObject({
        name: 'ForbiddenError',
      });

      mockContext.params = { id: 'qovkpekciob2wt8qyd51mg8k' };

      await expect(buildController().destroy(mockContext)).rejects.toMatchObject({
        name: 'ForbiddenError',
      });
      expect(mockUploadService.remove).not.toHaveBeenCalled();
    });
  });

  describe('every other caller (API token, Users & Permissions, admin)', () => {
    const png = { filepath: '/tmp/a.png', originalFilename: 'a.png', mimetype: 'image/png' };

    beforeEach(() => {
      (globalThis.strapi as any).db = { query: jest.fn() };
      mockGetService.mockImplementation((serviceName: string) => {
        if (serviceName === 'upload') {
          return { ...mockUploadService, upload: jest.fn().mockResolvedValue([{ id: 3 }]) };
        }
        if (serviceName === 'file') return mockFileService;
        if (serviceName === 'api-upload-folder') {
          return { getAPIUploadFolder: jest.fn().mockResolvedValue({ id: 1 }) };
        }
        return {};
      });
      mockPrepareUploadRequest.mockImplementation(async (_files: any, body: any) => ({
        validFiles: [png],
        filteredBody: body,
        errors: [],
      }));
    });

    it('still links to any ref with no entry check', async () => {
      const permissions = (globalThis.strapi as any).contentAPI.permissions;

      mockContext.query = {} as any;
      mockContext.request = {
        body: { ref: 'api::any.any', refId: '12', field: 'whatever' },
        files: { files: png },
      } as any;

      await buildController().upload(mockContext);

      expect(permissions.assertEntry).not.toHaveBeenCalled();
      expect(mockContext.status).toBe(201);
    });

    it('still updates a file by id, with no files', async () => {
      const file = { id: 5 };

      mockContext.query = { id: '5' } as any;
      mockContext.request = { body: {} } as any;
      mockUploadService.updateFileInfo.mockResolvedValue(file);

      await buildController().upload(mockContext);

      expect(mockUploadService.updateFileInfo).toHaveBeenCalledWith('5', expect.anything());
    });

    it('still deletes a file by id', async () => {
      const file = { id: 7 };

      mockContext.params = { id: '7' };
      mockUploadService.findOne.mockResolvedValue(file);

      await buildController().destroy(mockContext);

      expect(mockUploadService.remove).toHaveBeenCalledWith(file);
    });
  });
});
