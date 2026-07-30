import spaceControllerFactory from '../space';

const buildMocks = ({
  existingBySlug = null as any,
  existingById = null as any,
  activeSpaces = [] as any[],
  scopedContentTypes = [] as any[],
  contentCountInSpace = 0,
} = {}) => {
  const create = jest.fn(async (data: any) => ({ id: 7, color: null, ...data }));
  const getBySlug = jest.fn().mockResolvedValue(existingBySlug);
  const getById = jest.fn().mockResolvedValue(existingById);
  const getAll = jest.fn().mockResolvedValue(activeSpaces);
  const update = jest.fn(async (id: number, data: any) => ({ ...existingById, ...data }));
  const deleteSpace = jest.fn().mockResolvedValue(undefined);
  const count = jest.fn().mockResolvedValue(contentCountInSpace);

  const services: Record<string, any> = {
    spaces: { getBySlug, getById, getAll, create, update, delete: deleteSpace },
    'content-types': {
      getSpaceScopedContentTypes: jest.fn().mockReturnValue(scopedContentTypes),
    },
  };

  const strapi = {
    contentTypes: {},
    plugins: {
      spaces: { services },
    },
    db: {
      query: jest.fn(() => ({ count })),
    },
  } as any;

  (global as any).strapi = strapi;

  const controller = spaceControllerFactory({ strapi });

  return { controller, create, getBySlug, getById, getAll, update, deleteSpace, count };
};

const makeCtx = (body: unknown, params?: Record<string, unknown>) => ({
  request: { body },
  params,
  body: undefined as unknown,
});

describe('space controller — create', () => {
  it('rejects a missing name', async () => {
    const { controller } = buildMocks();

    await expect(controller.create(makeCtx({}))).rejects.toThrow('Missing or invalid `name`');
    await expect(controller.create(makeCtx({ name: '   ' }))).rejects.toThrow(
      'Missing or invalid `name`'
    );
  });

  it('derives the slug from the name and applies default capabilities', async () => {
    const { controller, create } = buildMocks();
    const ctx = makeCtx({ name: 'Acme France!' });

    await controller.create(ctx);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme France!',
        slug: 'acme-france',
        color: null,
        capabilities: expect.objectContaining({ apiTokens: true, roles: true }),
      })
    );
    expect(ctx.body).toMatchObject({ slug: 'acme-france', name: 'Acme France!' });
  });

  it('rejects malformed capabilities', async () => {
    const { controller } = buildMocks();

    await expect(
      controller.create(makeCtx({ name: 'Acme', capabilities: { nope: true } }))
    ).rejects.toThrow('Unknown capability "nope"');
    await expect(
      controller.create(makeCtx({ name: 'Acme', capabilities: { webhooks: 'yes' } }))
    ).rejects.toThrow('Capability "webhooks" must be a boolean');
  });

  it('slugifies an explicitly provided slug', async () => {
    const { controller, create } = buildMocks();

    await controller.create(makeCtx({ name: 'Acme', slug: 'Már Keting ' }));

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'mar-keting' }));
  });

  it('rejects a duplicate slug', async () => {
    const { controller, create } = buildMocks({
      existingBySlug: { id: 1, slug: 'acme' },
    });

    await expect(controller.create(makeCtx({ name: 'Acme' }))).rejects.toThrow(
      'A space with the slug "acme" already exists'
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an invalid color and accepts a valid one', async () => {
    const { controller, create } = buildMocks();

    await expect(controller.create(makeCtx({ name: 'Acme', color: 'blue' }))).rejects.toThrow(
      '`color` must be a #rrggbb hex value'
    );

    await controller.create(makeCtx({ name: 'Acme', color: '#EE5E52' }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ color: '#EE5E52' }));
  });

  it('rejects a name that slugifies to nothing', async () => {
    const { controller } = buildMocks();

    await expect(controller.create(makeCtx({ name: '!!!' }))).rejects.toThrow(
      'Could not derive a valid slug'
    );
  });
});

describe('space controller — update', () => {
  const acme = { id: 2, slug: 'acme', name: 'Acme', color: '#EE5E52', status: 'active' };

  it('rejects an invalid id and an unknown space', async () => {
    const { controller } = buildMocks();

    await expect(controller.update(makeCtx({ name: 'X' }, { id: 'nope' }))).rejects.toThrow(
      'Invalid space id'
    );
    await expect(controller.update(makeCtx({ name: 'X' }, { id: '99' }))).rejects.toThrow(
      'Unknown space: 99'
    );
  });

  it('renames the slug (slugified, uniqueness enforced)', async () => {
    const { controller, update } = buildMocks({ existingById: acme });

    await controller.update(makeCtx({ slug: 'Acme West!' }, { id: '2' }));
    expect(update).toHaveBeenCalledWith(2, { slug: 'acme-west' });
  });

  it('locks the default workspace slug', async () => {
    const def = { id: 1, slug: 'default', name: 'Default', color: null, status: 'active' };
    const { controller, update } = buildMocks({ existingById: def });

    await expect(controller.update(makeCtx({ slug: 'main' }, { id: '1' }))).rejects.toThrow(
      'The default workspace slug is locked'
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses a slug change while a content type still references it', async () => {
    const { controller, update } = buildMocks({ existingById: acme });
    (global as any).strapi.contentTypes = {
      'api::article.article': {
        uid: 'api::article.article',
        pluginOptions: { spaces: { visibleIn: ['acme'] } },
      },
    };

    await expect(controller.update(makeCtx({ slug: 'acme-corp' }, { id: '2' }))).rejects.toThrow(
      'is referenced by the Workspaces selection of api::article.article'
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses a slug already taken by another workspace', async () => {
    const { controller, update, getBySlug } = buildMocks({ existingById: acme });
    getBySlug.mockResolvedValue({ id: 9, slug: 'other' });

    await expect(controller.update(makeCtx({ slug: 'other' }, { id: '2' }))).rejects.toThrow(
      'A space with the slug "other" already exists'
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('renames and recolors', async () => {
    const { controller, update } = buildMocks({ existingById: acme });
    const ctx = makeCtx({ name: '  Acme Corp ', color: '#328048' }, { id: '2' });

    await controller.update(ctx);

    expect(update).toHaveBeenCalledWith(2, { name: 'Acme Corp', color: '#328048' });
    expect(ctx.body).toMatchObject({ slug: 'acme', name: 'Acme Corp', status: 'active' });
  });

  it('refuses to archive the last active workspace', async () => {
    const { controller, update } = buildMocks({
      existingById: acme,
      activeSpaces: [acme], // acme is the only active space left
    });

    await expect(controller.update(makeCtx({ status: 'archived' }, { id: '2' }))).rejects.toThrow(
      'Cannot archive the last active workspace'
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('archives when another active workspace remains, and restores freely', async () => {
    const other = { id: 1, slug: 'default', name: 'Default', color: null, status: 'active' };
    const { controller, update } = buildMocks({
      existingById: acme,
      activeSpaces: [acme, other],
    });

    await controller.update(makeCtx({ status: 'archived' }, { id: '2' }));
    expect(update).toHaveBeenCalledWith(2, { status: 'archived' });

    const archived = { ...acme, status: 'archived' };
    const restore = buildMocks({ existingById: archived, activeSpaces: [other] });
    await restore.controller.update(makeCtx({ status: 'active' }, { id: '2' }));
    expect(restore.update).toHaveBeenCalledWith(2, { status: 'active' });
  });

  it('rejects an invalid status or color', async () => {
    const { controller } = buildMocks({ existingById: acme });

    await expect(controller.update(makeCtx({ status: 'paused' }, { id: '2' }))).rejects.toThrow(
      '`status` must be "active" or "archived"'
    );
    await expect(controller.update(makeCtx({ color: 'red' }, { id: '2' }))).rejects.toThrow(
      '`color` must be a #rrggbb hex value'
    );
  });
});

describe('space controller — delete', () => {
  const acme = { id: 2, slug: 'acme', name: 'Acme', color: '#EE5E52', status: 'active' };

  it('refuses to delete the default workspace', async () => {
    const def = { id: 1, slug: 'default', name: 'Default', color: null, status: 'active' };
    const { controller, deleteSpace } = buildMocks({ existingById: def });

    await expect(controller.delete(makeCtx({}, { id: '1' }))).rejects.toThrow(
      'The default workspace cannot be deleted'
    );
    expect(deleteSpace).not.toHaveBeenCalled();
  });

  it('refuses to delete a workspace that still holds content', async () => {
    const { controller, deleteSpace } = buildMocks({
      existingById: acme,
      scopedContentTypes: [{ uid: 'api::article.article' }],
      contentCountInSpace: 3,
    });

    await expect(controller.delete(makeCtx({}, { id: '2' }))).rejects.toThrow(
      '3 api::article.article entries still live in it'
    );
    expect(deleteSpace).not.toHaveBeenCalled();
  });

  it('deletes an empty non-default workspace', async () => {
    const { controller, deleteSpace } = buildMocks({
      existingById: acme,
      scopedContentTypes: [{ uid: 'api::article.article' }],
      contentCountInSpace: 0,
    });
    const ctx = makeCtx({}, { id: '2' });

    await controller.delete(ctx);

    expect(deleteSpace).toHaveBeenCalledWith(2);
    expect(ctx.body).toEqual({ id: 2, slug: 'acme' });
  });
});
