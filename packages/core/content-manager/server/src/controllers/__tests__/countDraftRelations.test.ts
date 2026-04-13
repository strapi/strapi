// @ts-expect-error - test helper
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import controller from '../collection-types';

// Helpers to create fresh mocks per test
const createMocks = (overrides: Record<string, any> = {}) => {
  const populateFromQuery = jest.fn().mockReturnThis();
  const buildPopulate = jest.fn().mockResolvedValue({ createdBy: true });

  const findOne = jest.fn().mockResolvedValue({ id: 1, createdBy: { id: 1 } });
  const countDraftRelations = jest.fn().mockResolvedValue(3);
  const sanitizedQueryRead = jest.fn().mockResolvedValue({});

  const cannotRead = jest.fn().mockReturnValue(false);
  const requiresEntityRead = jest.fn().mockReturnValue(true);

  return {
    populateFromQuery,
    buildPopulate,
    findOne,
    countDraftRelations,
    sanitizedQueryRead,
    cannotRead,
    requiresEntityRead,
    ...overrides,
  };
};

const setupStrapi = (mocks: ReturnType<typeof createMocks>) => {
  global.strapi = {
    getModel: jest.fn().mockReturnValue({
      uid: 'test-model',
      attributes: {},
    }),
    plugins: {
      'content-manager': {
        services: {
          'permission-checker': {
            create: jest.fn().mockReturnValue({
              cannot: { read: mocks.cannotRead },
              requiresEntity: { read: mocks.requiresEntityRead },
              sanitizedQuery: { read: mocks.sanitizedQueryRead },
            }),
          },
          'populate-builder': () => ({
            populateFromQuery: mocks.populateFromQuery,
            build: mocks.buildPopulate,
          }),
          'document-manager': {
            findOne: mocks.findOne,
            countDraftRelations: mocks.countDraftRelations,
          },
        },
      },
    },
  } as any;
};

const createCtx = (overrides: Record<string, any> = {}) => {
  const ctx = createContext(
    {
      params: { model: 'test-model', id: 'doc-1' },
      query: {},
      ...overrides,
    },
    { state: { userAbility: {} } }
  );

  ctx.forbidden = jest.fn(() => {
    ctx.status = 403;
  });

  ctx.notFound = jest.fn(() => {
    ctx.status = 404;
  });

  return ctx;
};

describe('countDraftRelations', () => {
  it('builds populate from the permission query and passes it to findOne', async () => {
    const mocks = createMocks();
    setupStrapi(mocks);

    await controller.countDraftRelations(createCtx());

    expect(mocks.sanitizedQueryRead).toHaveBeenCalledWith({});
    expect(mocks.populateFromQuery).toHaveBeenCalledWith({});

    expect(mocks.findOne).toHaveBeenCalledWith(
      'doc-1',
      'test-model',
      expect.objectContaining({ populate: { createdBy: true } })
    );
  });

  it('returns the draft relation count on success', async () => {
    const mocks = createMocks();
    setupStrapi(mocks);

    const res = await controller.countDraftRelations(createCtx());

    expect(res.data).toBe(3);
  });

  it('returns 403 when the user lacks read permission entirely', async () => {
    const mocks = createMocks({ cannotRead: jest.fn().mockReturnValue(true) });
    setupStrapi(mocks);

    const ctx = createCtx();
    await controller.countDraftRelations(ctx);

    expect(ctx.status).toBe(403);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it('returns 404 when the entity does not exist', async () => {
    const mocks = createMocks({ findOne: jest.fn().mockResolvedValue(null) });
    setupStrapi(mocks);

    const ctx = createCtx();
    await controller.countDraftRelations(ctx);

    expect(ctx.status).toBe(404);
    expect(mocks.countDraftRelations).not.toHaveBeenCalled();
  });

  it('returns 403 when entity-level RBAC condition fails', async () => {
    const cannotReadEntity = jest.fn().mockImplementation((entity) => {
      return entity !== undefined;
    });

    const mocks = createMocks({ cannotRead: cannotReadEntity });
    setupStrapi(mocks);

    const ctx = createCtx();
    await controller.countDraftRelations(ctx);

    expect(ctx.status).toBe(403);
    expect(mocks.findOne).toHaveBeenCalledWith(
      'doc-1',
      'test-model',
      expect.objectContaining({ populate: { createdBy: true } })
    );
  });

  it('skips entity load when RBAC does not require it', async () => {
    const mocks = createMocks({
      requiresEntityRead: jest.fn().mockReturnValue(false),
    });
    setupStrapi(mocks);

    const res = await controller.countDraftRelations(createCtx());

    expect(res.data).toBe(3);
    expect(mocks.findOne).not.toHaveBeenCalled();
    expect(mocks.populateFromQuery).not.toHaveBeenCalled();
  });
});
