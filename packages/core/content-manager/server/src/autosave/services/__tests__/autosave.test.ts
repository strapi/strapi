import { createAutosaveService } from '../autosave';
import { AUTOSAVE_UID } from '../../constants';

const findOne = jest.fn();
const findMany = jest.fn();
const create = jest.fn();
const update = jest.fn();
const deleteMany = jest.fn();

const strapi = {
  db: {
    query(uid: string) {
      if (uid !== AUTOSAVE_UID) {
        throw new Error(`Unexpected query on ${uid}`);
      }

      return { findOne, findMany, create, update, deleteMany };
    },
    transaction: (run: () => Promise<unknown>) => run(),
  },
} as any;

const scope = {
  userId: 1,
  contentType: 'api::article.article' as const,
  documentId: 'doc-1',
  locale: 'en',
};

describe('autosave service', () => {
  const service = createAutosaveService({ strapi });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the backup belonging to the requesting user only', async () => {
    findOne.mockResolvedValue({
      contentType: 'api::article.article',
      documentId: 'doc-1',
      locale: 'en',
      data: { title: 'Recovered' },
      baseVersion: '2026-01-01T00:00:00.000Z',
      savedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    const entry = await service.findOne(scope);

    expect(findOne).toHaveBeenCalledWith({
      where: {
        user: { id: 1 },
        contentType: 'api::article.article',
        documentId: 'doc-1',
        locale: 'en',
      },
    });
    expect(entry).toEqual({
      contentType: 'api::article.article',
      documentId: 'doc-1',
      locale: 'en',
      data: { title: 'Recovered' },
      schema: null,
      baseVersion: '2026-01-01T00:00:00.000Z',
      savedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  it('stores the schema the backup was captured against', async () => {
    findMany.mockResolvedValue([]);
    create.mockImplementation(({ data }: any) => data);

    await service.save(scope, {
      data: { title: 'Draft' } as any,
      schema: { title: { type: 'string' } } as any,
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ schema: { title: { type: 'string' } } }),
    });
  });

  it('reports a content type without i18n as having no locale', async () => {
    findOne.mockResolvedValue({
      contentType: 'api::homepage.homepage',
      documentId: 'doc-1',
      locale: '',
      data: {},
      baseVersion: null,
      savedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    const entry = await service.findOne({ ...scope, locale: undefined });

    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Object) }));
    expect(entry?.locale).toBeNull();
    expect(entry?.baseVersion).toBeNull();
  });

  it('creates a backup the first time a document is edited', async () => {
    findMany.mockResolvedValue([]);
    create.mockImplementation(({ data }: any) => data);

    await service.save(scope, {
      data: { title: 'Draft' } as any,
      baseVersion: '2026-01-01T00:00:00.000Z',
    });

    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contentType: 'api::article.article',
        documentId: 'doc-1',
        locale: 'en',
        data: { title: 'Draft' },
        baseVersion: '2026-01-01T00:00:00.000Z',
        user: 1,
      }),
    });
  });

  it('overwrites the previous backup instead of piling up rows', async () => {
    findMany.mockResolvedValue([{ id: 7 }]);
    update.mockImplementation(({ data }: any) => data);

    await service.save(scope, { data: { title: 'Draft' } as any });

    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({ data: { title: 'Draft' }, baseVersion: null }),
    });
  });

  it('collapses duplicates left behind by a database without the unique index', async () => {
    findMany.mockResolvedValue([{ id: 7 }, { id: 8 }, { id: 9 }]);
    update.mockImplementation(({ data }: any) => data);

    await service.save(scope, { data: { title: 'Draft' } as any });

    expect(deleteMany).toHaveBeenCalledWith({ where: { id: { $in: [8, 9] } } });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 } }));
  });

  it('removes backups for a deleted document and for a deleted user', async () => {
    await service.deleteForDocument({
      contentType: 'api::article.article',
      documentId: 'doc-1',
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { contentType: 'api::article.article', documentId: 'doc-1' },
    });

    await service.deleteForUser(1);
    expect(deleteMany).toHaveBeenCalledWith({ where: { user: { id: 1 } } });
  });
});
