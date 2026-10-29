import contentTypesController from '../content-types';

const programmaticCT = {
  uid: 'api::article.article',
  pluginOptions: { 'content-type-builder': { origin: 'programmatic' } },
};

const fileBasedCT = {
  uid: 'api::page.page',
  pluginOptions: {},
};

const makeCtx = (uid: string) => {
  const ctx: any = {
    params: { uid },
    request: { body: { contentType: {} } },
    send: jest.fn((body: unknown, status?: number) => {
      ctx.body = body;
      ctx.status = status;
    }),
  };
  return ctx;
};

describe('content-types controller — programmatic read-only gating', () => {
  const editContentType = jest.fn();
  const deleteContentType = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // The global unit setup derives `strapi.plugin(name).service(name)` from
    // `strapi.plugins[name].services[name]`, so mirror that shape here.
    global.strapi = {
      contentTypes: {
        'api::article.article': programmaticCT,
        'api::page.page': fileBasedCT,
      },
      plugins: {
        'content-type-builder': {
          services: { 'content-types': { editContentType, deleteContentType } },
        },
      },
      reload: Object.assign(jest.fn(), { isWatching: true }),
      log: { error: jest.fn() },
    } as any;
  });

  it('rejects updates to programmatic content types with a read-only error', async () => {
    const ctx = makeCtx('api::article.article');
    await contentTypesController.updateContentType(ctx);

    expect(ctx.status).toBe(400);
    expect(ctx.body).toEqual({ error: 'contentType.programmatic.readonly' });
    expect(editContentType).not.toHaveBeenCalled();
  });

  it('rejects deletes of programmatic content types with a read-only error', async () => {
    const ctx = makeCtx('api::article.article');
    await contentTypesController.deleteContentType(ctx);

    expect(ctx.status).toBe(400);
    expect(ctx.body).toEqual({ error: 'contentType.programmatic.readonly' });
    expect(deleteContentType).not.toHaveBeenCalled();
  });

  it('does not gate file-based content types (passes the read-only check)', async () => {
    deleteContentType.mockResolvedValue({ uid: 'api::page.page' });
    const ctx = makeCtx('api::page.page');

    await contentTypesController.deleteContentType(ctx);

    // The read-only guard did not short-circuit; the delete service ran.
    expect(deleteContentType).toHaveBeenCalledWith('api::page.page');
    expect(ctx.body).not.toEqual({ error: 'contentType.programmatic.readonly' });
  });
});
