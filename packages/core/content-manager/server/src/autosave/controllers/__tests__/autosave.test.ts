import { errors } from '@strapi/utils';

import { createAutosaveController } from '../autosave';
import { getService as getContentManagerService } from '../../../utils';
import { getService } from '../../utils';

jest.mock('../../../utils');
jest.mock('../../utils');

const autosaveService = {
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

const permissionChecker = {
  cannot: { read: jest.fn(() => false), update: jest.fn(() => false) },
  sanitizedQuery: {
    read: jest.fn(async (query) => query),
    update: jest.fn(async (query) => query),
  },
  sanitizeOutput: jest.fn(async (data) => data),
  sanitizeUpdateInput: jest.fn(() => async (data: unknown) => data),
};

const document = { documentId: 'doc-1', title: 'Saved' };
const findDocument = jest.fn(async () => document);
const buildPopulate = jest.fn(async () => []);
const populateFromQuery = jest.fn(() => ({ build: buildPopulate }));
const populateBuilder = jest.fn(() => ({ populateFromQuery }));

const contentTypeAttributes = {
  title: { type: 'string' },
  body: { type: 'text' },
  updatedAt: { type: 'datetime' },
};

const strapi = {
  contentTypes: { 'api::article.article': { uid: 'api::article.article' } },
  getModel: jest.fn(() => ({ uid: 'api::article.article', attributes: contentTypeAttributes })),
} as any;

const createContext = (overrides: Record<string, any> = {}) => ({
  params: { model: 'api::article.article', documentId: 'doc-1' },
  query: { locale: 'en' },
  state: { user: { id: 1 }, userAbility: {} },
  request: { body: { data: { title: 'Draft' } } },
  ...overrides,
});

describe('autosave controller', () => {
  const controller = createAutosaveController({ strapi }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    permissionChecker.cannot.read.mockReturnValue(false);
    permissionChecker.cannot.update.mockReturnValue(false);
    jest.mocked(getContentManagerService).mockImplementation((serviceName) => {
      if (serviceName === 'permission-checker') {
        return { create: () => permissionChecker } as any;
      }

      if (serviceName === 'populate-builder') {
        return populateBuilder as any;
      }

      if (serviceName === 'document-manager') {
        return { findOne: findDocument } as any;
      }

      throw new Error(`Unexpected service: ${serviceName}`);
    });
    jest.mocked(getService).mockReturnValue(autosaveService as any);
  });

  it('scopes the backup to the signed-in user rather than anything the client sends', async () => {
    autosaveService.findOne.mockResolvedValue(null);

    const response = await controller.find(createContext({ query: { locale: 'en', userId: 999 } }));

    expect(autosaveService.findOne).toHaveBeenCalledWith({
      userId: 1,
      contentType: 'api::article.article',
      documentId: 'doc-1',
      locale: 'en',
    });
    expect(response).toEqual({ data: null });
  });

  it('refuses to read a backup of a document the user cannot read', async () => {
    permissionChecker.cannot.read.mockReturnValue(true);

    await expect(controller.find(createContext())).rejects.toThrow(errors.ForbiddenError);
    expect(autosaveService.findOne).not.toHaveBeenCalled();
  });

  it('sanitizes a backup against the localized document being read', async () => {
    autosaveService.findOne.mockResolvedValue({
      contentType: 'api::article.article',
      documentId: 'doc-1',
      locale: 'en',
      data: { title: 'Draft' },
      schema: { title: { type: 'string' }, body: { type: 'text' } },
      baseVersion: null,
      savedAt: '2026-01-01T00:00:00.000Z',
    });

    await controller.find(createContext());

    expect(findDocument).toHaveBeenCalledWith('doc-1', 'api::article.article', {
      populate: [],
      locale: 'en',
      status: 'draft',
    });
    expect(permissionChecker.cannot.read).toHaveBeenLastCalledWith(document);
    expect(permissionChecker.sanitizeOutput).toHaveBeenCalledWith(
      { title: 'Draft' },
      { subject: document }
    );
  });

  it('refuses to write a backup of a document the user cannot edit', async () => {
    permissionChecker.cannot.update.mockReturnValue(true);

    await expect(controller.save(createContext())).rejects.toThrow(errors.ForbiddenError);
    expect(autosaveService.save).not.toHaveBeenCalled();
  });

  it('strips fields the author is not allowed to edit before storing them', async () => {
    permissionChecker.sanitizeUpdateInput.mockReturnValue(async () => ({ title: 'Draft' }));
    autosaveService.save.mockResolvedValue({ savedAt: '2026-01-01T00:00:00.000Z' });

    await controller.save(
      createContext({
        request: {
          body: {
            data: { title: 'Draft', secret: 'nope' },
            baseVersion: '2026-01-01T00:00:00.000Z',
          },
        },
      })
    );

    expect(permissionChecker.sanitizeUpdateInput).toHaveBeenCalledWith(document);
    expect(permissionChecker.sanitizeUpdateInput.mock.results[0].value).toBeInstanceOf(Function);
    expect(autosaveService.save).toHaveBeenCalledWith(expect.any(Object), {
      data: { title: 'Draft' },
      schema: { title: { type: 'string' }, body: { type: 'text' } },
      baseVersion: '2026-01-01T00:00:00.000Z',
    });
    expect(findDocument).toHaveBeenCalledWith('doc-1', 'api::article.article', {
      populate: [],
      locale: 'en',
      status: 'draft',
    });
  });

  it('passes the backup payload to the entity-aware sanitizer', async () => {
    const sanitize = jest.fn(async () => ({ title: 'Draft' }));
    permissionChecker.sanitizeUpdateInput.mockReturnValue(sanitize);
    autosaveService.save.mockResolvedValue({ savedAt: '2026-01-01T00:00:00.000Z' });

    await controller.save(
      createContext({
        request: {
          body: {
            data: { title: 'Draft', secret: 'nope' },
          },
        },
      })
    );

    expect(sanitize).toHaveBeenCalledWith({
      title: 'Draft',
      secret: 'nope',
    });
  });

  it('uses the resolved default locale when a save request omits the locale query', async () => {
    findDocument.mockResolvedValueOnce({ ...document, locale: 'en' } as any);
    autosaveService.save.mockResolvedValue({ savedAt: '2026-01-01T00:00:00.000Z' });

    await controller.save(createContext({ query: {} }));

    expect(autosaveService.save).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en' }),
      expect.any(Object)
    );
  });

  it('drops fields the content type no longer has and reports what changed', async () => {
    autosaveService.findOne.mockResolvedValue({
      contentType: 'api::article.article',
      documentId: 'doc-1',
      locale: 'en',
      data: { title: 'Draft', tagline: 'Gone' },
      schema: { title: { type: 'string' }, tagline: { type: 'string' } },
      baseVersion: null,
      savedAt: '2026-01-01T00:00:00.000Z',
    });

    const response = await controller.find(createContext());

    expect(response.data.data).toEqual({ title: 'Draft' });
    expect(response.meta).toEqual({
      unknownAttributes: {
        added: { body: { type: 'text' } },
        removed: { tagline: { type: 'string' } },
      },
    });
  });

  it('reports no change when the backup still matches the content type', async () => {
    autosaveService.findOne.mockResolvedValue({
      contentType: 'api::article.article',
      documentId: 'doc-1',
      locale: 'en',
      data: { title: 'Draft' },
      schema: { title: { type: 'string' }, body: { type: 'text' } },
      baseVersion: null,
      savedAt: '2026-01-01T00:00:00.000Z',
    });

    const response = await controller.find(createContext());

    expect(response.data.data).toEqual({ title: 'Draft' });
    expect(response).not.toHaveProperty('meta');
  });

  it('takes a backup stored without a schema at face value', async () => {
    autosaveService.findOne.mockResolvedValue({
      contentType: 'api::article.article',
      documentId: 'doc-1',
      locale: 'en',
      data: { title: 'Draft', tagline: 'Kept' },
      schema: null,
      baseVersion: null,
      savedAt: '2026-01-01T00:00:00.000Z',
    });

    const response = await controller.find(createContext());

    expect(response.data.data).toEqual({ title: 'Draft', tagline: 'Kept' });
    expect(response).not.toHaveProperty('meta');
  });

  it('rejects a malformed payload', async () => {
    await expect(
      controller.save(createContext({ request: { body: { data: 'not an object' } } }))
    ).rejects.toThrow();
    expect(autosaveService.save).not.toHaveBeenCalled();
  });

  it('rejects a document that has never been created', async () => {
    await expect(
      controller.save(
        createContext({ params: { model: 'api::article.article', documentId: 'create:session-1' } })
      )
    ).rejects.toThrow(errors.ValidationError);
  });

  it('reports an unknown content type as missing', async () => {
    await expect(
      controller.find(createContext({ params: { model: 'api::ghost.ghost', documentId: 'doc-1' } }))
    ).rejects.toThrow(errors.NotFoundError);
  });

  it('deletes the backup once the author has committed or discarded it', async () => {
    const response = await controller.delete(createContext());

    expect(autosaveService.delete).toHaveBeenCalledWith({
      userId: 1,
      contentType: 'api::article.article',
      documentId: 'doc-1',
      locale: 'en',
    });
    expect(response).toEqual({ data: null });
  });
});
