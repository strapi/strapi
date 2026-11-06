import { describe, expect, it, vi } from 'vitest';

import createCollectionMutations from '../mutations/collection-type';
import createSingleMutations from '../mutations/single-type';
import createQueryResolvers from '../resolvers/query';
import createAssociationResolvers from '../resolvers/association';
import createComponentResolvers from '../resolvers/component';
import createDynamicZoneResolvers from '../resolvers/dynamic-zone';

// The publication filter's SQL needs a real connection: the tests are about what the resolver passes
vi.mock('@strapi/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@strapi/utils')>()),
  buildPublicationFilterWhere: vi.fn(() => ({})),
}));

const NOTE = 'api::note.note';
const ARTICLE = 'api::article.article';
const TAG = 'api::tag.tag';

const model = (uid: string, kind: string, draftAndPublish = false, attributes: any = {}) =>
  ({ uid, kind, modelType: 'contentType', options: { draftAndPublish }, attributes }) as any;

const note = model(NOTE, 'collectionType');
const article = model(ARTICLE, 'collectionType', true, {
  tags: { type: 'relation', relation: 'oneToMany', target: TAG },
  related: { type: 'relation', relation: 'morphToMany' },
  seo: { type: 'component', component: 'shared.seo' },
  blocks: { type: 'dynamiczone', components: ['shared.seo'] },
});
const seo = {
  uid: 'shared.seo',
  modelType: 'component',
  attributes: { owner: { type: 'relation', relation: 'oneToOne', target: TAG } },
} as any;
const tag = model(TAG, 'collectionType', true);
const homepage = model('api::homepage.homepage', 'singleType', true);

/** A mock whose calls are read by position, whatever the implementation declares */
const anyFn = (implementation: (...args: any[]) => unknown) =>
  vi.fn<(...args: any[]) => any>(implementation);

/** A strapi with every call the resolvers make recorded, for a caller who is or is not subject-aware */
const makeStrapi = ({ active }: { active: boolean }) => {
  const documents = {
    create: vi.fn(async (params: any) => ({
      documentId: 'new',
      publishedAt: null,
      ...params.data,
    })),
    update: vi.fn(async (params: any) => ({ documentId: params.documentId, publishedAt: null })),
    delete: vi.fn(async () => ({})),
    count: vi.fn(async () => 1),
    findOne: vi.fn(async () => ({ documentId: 'doc', publishedAt: 'now' })),
    findMany: vi.fn(async () => [{ documentId: 'a', publishedAt: 'now' }]),
    findFirst: vi.fn(async () => ({ documentId: 'a', publishedAt: 'now' })),
  };
  const order: string[] = [];
  const permissions = {
    isSubjectAware: vi.fn(() => active),
    checker: {
      filtersFor: vi.fn((): Record<string, unknown> | null => ({})),
      populateDepth: vi.fn((): number | null => null),
      isActive: vi.fn(() => active),
      canReadDrafts: vi.fn(() => true),
    },
    resolveWriteStatus: vi.fn(async (_auth: unknown, _uid: string, opts: any) => ({
      status: opts.requested,
      publishAfterCreate: false,
    })),
    assertEntry: vi.fn(async () => {
      order.push('assertEntry');
    }),
    assertWritten: vi.fn(async () => {}),
    publishIfAllowed: vi.fn(async () => false),
  };
  const contentAPI = {
    permissions,
    validate: {
      query: anyFn(async () => {}),
      input: anyFn(async () => {
        order.push('validate.input');
      }),
    },
    sanitize: {
      query: anyFn(async (query: any) => query),
      input: anyFn(async (data: any) => {
        order.push('sanitize.input');
        return { ...data, sanitized: true };
      }),
      output: anyFn(async (data: any) => data),
    },
  };
  const existing = { documentId: 'doc' };
  const query = { findOne: vi.fn(async () => existing), load: vi.fn(async () => []) };
  const services: Record<string, any> = {
    utils: {
      naming: {
        getCreateMutationTypeName: () => 'createX',
        getUpdateMutationTypeName: () => 'updateX',
        getDeleteMutationTypeName: () => 'deleteX',
        getContentTypeInputName: () => 'XInput',
        getTypeName: () => 'X',
      },
      attributes: {
        isMorphRelation: (attribute: any) => attribute.relation?.includes('morph') ?? false,
        isMedia: () => false,
      },
    },
    internals: { args: { PublicationStatusArg: 'PublicationStatus' } },
    extension: {
      use: vi.fn(),
      shadowCRUD: () => ({ isActionEnabled: () => true }),
    },
    constants: { DELETE_MUTATION_RESPONSE_TYPE_NAME: 'DeleteMutationResponse' },
    builders: { utils: { transformArgs: (args: any) => args } },
    format: {
      returnTypes: {
        toEntityResponse: (value: unknown) => ({ value }),
        toEntityResponseCollection: (nodes: unknown) => ({ nodes }),
      },
    },
    'content-api': { isBuiltInQueryField: () => true },
  };
  const models: Record<string, any> = {
    [NOTE]: note,
    [ARTICLE]: article,
    [TAG]: tag,
    'shared.seo': seo,
  };

  const strapi = {
    contentAPI,
    documents: vi.fn(() => documents),
    db: {
      transaction: vi.fn(async (callback: () => unknown) => callback()),
      query: vi.fn(() => query),
      metadata: { get: vi.fn() },
      connection: {},
    },
    localization: {
      isLocalizedContentType: vi.fn(() => false),
      getDefaultLocale: vi.fn(async () => 'en'),
    },
    plugin: vi.fn(() => ({ service: (name: string) => services[name] })),
    getModel: (uid: string) => models[uid],
    get: vi.fn(() => ({
      transform(_uid: string, query: any) {
        return query;
      },
    })),
  } as any;

  return { strapi, documents, permissions, contentAPI, order, query };
};

/** The resolvers a mutations builder registers, by field name */
const mutationsOf = (builder: any, build: string, contentType: any) => {
  const fields: Record<string, any> = {};

  builder[build](contentType).value.definition({
    field(name: string, config: unknown) {
      fields[name] = config;
    },
  });

  return fields;
};

const context = (auth: unknown = { ability: {} }): any => ({ state: { auth } });
const info = { path: { key: 'root' } };

describe('collection type mutations', () => {
  describe('for a caller that is not subject-aware', () => {
    it('create, update and delete do what they did: no gate, no output sanitizing', async () => {
      const { strapi, documents, permissions, contentAPI } = makeStrapi({ active: false });
      const fields = mutationsOf(
        createCollectionMutations({ strapi } as any),
        'buildCollectionTypeMutations',
        note
      );

      await fields.createX.resolve({}, { status: 'draft', data: { title: 't' } }, context(), info);
      await fields.updateX.resolve(
        {},
        { documentId: 'd', status: null, locale: null, data: { title: 't' } },
        context(),
        info
      );
      await fields.deleteX.resolve({}, { documentId: 'd', locale: 'fr' }, context());

      expect(documents.create).toHaveBeenCalledWith({
        status: 'draft',
        data: { title: 't', sanitized: true },
      });
      expect(documents.update).toHaveBeenCalledWith({
        documentId: 'd',
        status: null,
        locale: null,
        data: { title: 't', sanitized: true },
      });
      expect(documents.delete).toHaveBeenCalledWith({ documentId: 'd' });
      expect(contentAPI.sanitize.input).toHaveBeenCalledTimes(2);
      expect(contentAPI.sanitize.input.mock.calls[0][2]).toEqual({ auth: { ability: {} } });
      expect(contentAPI.validate.input).not.toHaveBeenCalled();
      expect(contentAPI.sanitize.output).not.toHaveBeenCalled();
      expect(permissions.assertEntry).not.toHaveBeenCalled();
      expect(permissions.resolveWriteStatus).not.toHaveBeenCalled();
    });
  });

  describe('for a subject-aware caller', () => {
    it('create writes the resolved status, validates then sanitizes the input as a create, and sanitizes the output', async () => {
      const { strapi, documents, permissions, contentAPI, order } = makeStrapi({ active: true });
      permissions.resolveWriteStatus.mockResolvedValue({
        status: 'draft',
        publishAfterCreate: false,
      });
      const fields = mutationsOf(
        createCollectionMutations({ strapi } as any),
        'buildCollectionTypeMutations',
        article
      );
      const ctx = context();

      await fields.createX.resolve(
        {},
        { status: 'published', locale: null, data: { title: 't' } },
        ctx,
        info
      );

      expect(permissions.resolveWriteStatus).toHaveBeenCalledWith(ctx.state.auth, ARTICLE, {
        requested: 'published',
        locale: undefined,
      });
      expect(order).toEqual(['validate.input', 'sanitize.input']);
      expect(contentAPI.validate.input).toHaveBeenCalledWith({ title: 't' }, article, {
        auth: ctx.state.auth,
        action: 'create',
      });
      expect(documents.create).toHaveBeenCalledWith({
        status: 'draft',
        data: { title: 't', sanitized: true },
      });
      expect(contentAPI.sanitize.output).toHaveBeenCalledWith(expect.anything(), article, {
        auth: ctx.state.auth,
        action: 'create',
        status: 'draft',
      });
      expect(ctx.writeScopeByPath.get('root')).toEqual({ status: 'draft' });
    });

    it('create is refused before anything is written when the create rows give no entry', async () => {
      const { strapi, documents, permissions } = makeStrapi({ active: true });
      permissions.checker.filtersFor.mockReturnValue(null);
      const fields = mutationsOf(
        createCollectionMutations({ strapi } as any),
        'buildCollectionTypeMutations',
        note
      );

      await expect(fields.createX.resolve({}, { data: {} }, context(), info)).rejects.toThrow();
      expect(documents.create).not.toHaveBeenCalled();
    });

    it("create publishes in the same transaction when the caller's conditioned publish row matches", async () => {
      const { strapi, documents, permissions } = makeStrapi({ active: true });
      permissions.resolveWriteStatus.mockResolvedValue({
        status: 'draft',
        publishAfterCreate: true,
      });
      permissions.publishIfAllowed.mockResolvedValue(true);
      const fields = mutationsOf(
        createCollectionMutations({ strapi } as any),
        'buildCollectionTypeMutations',
        article
      );

      await fields.createX.resolve({}, { data: { title: 't' } }, context(), info);

      expect(strapi.db.transaction).toHaveBeenCalledTimes(1);
      expect(permissions.publishIfAllowed).toHaveBeenCalledWith(expect.anything(), ARTICLE, 'new', {
        locale: undefined,
      });
      expect(documents.findOne).toHaveBeenCalledWith({ documentId: 'new', status: 'published' });
    });

    it('update checks the stored entry before it validates, sanitizes or writes, and treats null locale as none', async () => {
      const { strapi, documents, permissions, contentAPI, order } = makeStrapi({ active: true });
      permissions.resolveWriteStatus.mockResolvedValue({
        status: 'draft',
        publishAfterCreate: false,
      });
      const fields = mutationsOf(
        createCollectionMutations({ strapi } as any),
        'buildCollectionTypeMutations',
        article
      );
      const ctx = context();

      await fields.updateX.resolve(
        {},
        { documentId: 'd', status: null, locale: null, data: { title: 't' } },
        ctx,
        info
      );

      expect(permissions.assertEntry).toHaveBeenCalledWith(ctx.state.auth, 'update', ARTICLE, 'd', {
        locale: undefined,
      });
      expect(order).toEqual(['assertEntry', 'validate.input', 'sanitize.input']);
      expect(contentAPI.validate.input).toHaveBeenCalledWith({ title: 't' }, article, {
        auth: ctx.state.auth,
        action: 'update',
        documentId: 'd',
      });
      expect(documents.update).toHaveBeenCalledWith({
        documentId: 'd',
        status: 'draft',
        data: { title: 't', sanitized: true },
      });
    });

    it("update refuses an entry that is not the caller's and writes nothing", async () => {
      const { strapi, documents, permissions } = makeStrapi({ active: true });
      permissions.assertEntry.mockRejectedValue(new Error('Not Found'));
      const fields = mutationsOf(
        createCollectionMutations({ strapi } as any),
        'buildCollectionTypeMutations',
        note
      );

      await expect(
        fields.updateX.resolve({}, { documentId: 'd', data: {} }, context(), info)
      ).rejects.toThrow('Not Found');
      expect(documents.update).not.toHaveBeenCalled();
    });

    it('update that publishes also checks the publish row against the stored entry', async () => {
      const { strapi, permissions } = makeStrapi({ active: true });
      permissions.resolveWriteStatus.mockResolvedValue({
        status: 'published',
        publishAfterCreate: false,
      });
      const fields = mutationsOf(
        createCollectionMutations({ strapi } as any),
        'buildCollectionTypeMutations',
        article
      );
      const ctx = context();

      await fields.updateX.resolve(
        {},
        { documentId: 'd', status: 'published', data: {} },
        ctx,
        info
      );

      expect(permissions.assertEntry.mock.calls.map((call: unknown[]) => call[1])).toEqual([
        'update',
        'publish',
      ]);
    });

    it('update that adds a locale is a create (stamp), checked again in its transaction after the write', async () => {
      const { strapi, documents, permissions, contentAPI } = makeStrapi({ active: true });
      strapi.localization.isLocalizedContentType.mockReturnValue(true);
      documents.count.mockResolvedValue(0);
      const fields = mutationsOf(
        createCollectionMutations({ strapi } as any),
        'buildCollectionTypeMutations',
        article
      );

      await fields.updateX.resolve(
        {},
        { documentId: 'd', locale: 'fr', data: {} },
        context(),
        info
      );

      expect(permissions.resolveWriteStatus.mock.calls[0][2]).toEqual({
        requested: undefined,
        locale: 'fr',
      });
      expect(contentAPI.validate.input.mock.calls[0][2]).toMatchObject({
        creates: true,
        locale: 'fr',
      });
      expect(strapi.db.transaction).toHaveBeenCalledTimes(1);
      expect(permissions.assertEntry).toHaveBeenCalledTimes(2);
      expect(documents.update.mock.invocationCallOrder[0]).toBeLessThan(
        permissions.assertEntry.mock.invocationCallOrder[1]
      );
      // The data written is judged in the same transaction, as a create, after the write
      expect(permissions.assertWritten).toHaveBeenCalledTimes(1);
      expect((permissions.assertWritten.mock.calls[0] as unknown[])[1]).toBe('create');
      expect(documents.update.mock.invocationCallOrder[0]).toBeLessThan(
        permissions.assertWritten.mock.invocationCallOrder[0]
      );
    });

    it('update under a conditioned publish writes the draft, then publishes it as written, in one transaction', async () => {
      const { strapi, documents, permissions } = makeStrapi({ active: true });
      permissions.resolveWriteStatus.mockResolvedValue({
        status: 'draft',
        publishAfterCreate: true,
      });
      permissions.publishIfAllowed.mockResolvedValue(true);
      const fields = mutationsOf(
        createCollectionMutations({ strapi } as any),
        'buildCollectionTypeMutations',
        article
      );

      await fields.updateX.resolve({}, { documentId: 'd', data: { title: 't' } }, context(), info);

      // No publish check on the stored versions before the write
      expect(permissions.assertEntry.mock.calls.map((call: unknown[]) => call[1])).toEqual([
        'update',
      ]);
      expect(strapi.db.transaction).toHaveBeenCalledTimes(1);
      expect(documents.update).toHaveBeenCalledWith({
        documentId: 'd',
        status: 'draft',
        data: { title: 't', sanitized: true },
      });
      expect(documents.update.mock.invocationCallOrder[0]).toBeLessThan(
        permissions.publishIfAllowed.mock.invocationCallOrder[0]
      );
      expect(permissions.publishIfAllowed).toHaveBeenCalledWith(expect.anything(), ARTICLE, 'd', {
        locale: undefined,
      });
    });

    it('update that adds a locale is refused, with nothing written, when the create rows give no entry', async () => {
      const { strapi, documents, permissions } = makeStrapi({ active: true });
      strapi.localization.isLocalizedContentType.mockReturnValue(true);
      documents.count.mockResolvedValue(0);
      permissions.checker.filtersFor.mockReturnValue(null);
      const fields = mutationsOf(
        createCollectionMutations({ strapi } as any),
        'buildCollectionTypeMutations',
        article
      );

      await expect(
        fields.updateX.resolve({}, { documentId: 'd', locale: 'fr', data: {} }, context(), info)
      ).rejects.toThrow();
      expect(permissions.checker.filtersFor).toHaveBeenCalledWith(
        expect.anything(),
        'create',
        ARTICLE
      );
      expect(documents.update).not.toHaveBeenCalled();
    });

    it("delete checks the stored entry first, and leaves it in place when it is not the caller's", async () => {
      const { strapi, documents, permissions } = makeStrapi({ active: true });
      const fields = mutationsOf(
        createCollectionMutations({ strapi } as any),
        'buildCollectionTypeMutations',
        note
      );
      const ctx = context();

      await expect(
        fields.deleteX.resolve({}, { documentId: 'd', locale: 'fr' }, ctx)
      ).resolves.toEqual({ documentId: 'd' });
      expect(permissions.assertEntry).toHaveBeenCalledWith(ctx.state.auth, 'delete', NOTE, 'd', {
        locale: 'fr',
      });
      expect(documents.delete).toHaveBeenCalledWith({ documentId: 'd', locale: 'fr' });

      documents.delete.mockClear();
      permissions.assertEntry.mockRejectedValue(new Error('Not Found'));

      await expect(fields.deleteX.resolve({}, { documentId: 'd' }, ctx)).rejects.toThrow(
        'Not Found'
      );
      expect(documents.delete).not.toHaveBeenCalled();
    });
  });
});

describe('single type mutations', () => {
  it('give a caller that is not subject-aware what they got: the first update creates', async () => {
    const { strapi, documents, query, permissions } = makeStrapi({ active: false });
    query.findOne.mockResolvedValue(null as any);
    const fields = mutationsOf(
      createSingleMutations({ strapi } as any),
      'buildSingleTypeMutations',
      homepage
    );

    await fields.updateX.resolve({}, { status: 'draft', data: { title: 't' } }, context(), info);

    expect(documents.create).toHaveBeenCalledWith({
      status: 'draft',
      data: { title: 't', sanitized: true },
    });
    expect(permissions.assertEntry).not.toHaveBeenCalled();
  });

  it('create the document as a create for a subject-aware caller: stamp, create rows, no entry to check', async () => {
    const { strapi, documents, query, permissions, contentAPI } = makeStrapi({ active: true });
    query.findOne.mockResolvedValue(null as any);
    permissions.resolveWriteStatus.mockResolvedValue({
      status: 'draft',
      publishAfterCreate: false,
    });
    const fields = mutationsOf(
      createSingleMutations({ strapi } as any),
      'buildSingleTypeMutations',
      homepage
    );

    await fields.updateX.resolve({}, { data: { title: 't' } }, context(), info);

    expect(permissions.checker.filtersFor).toHaveBeenCalledWith(
      expect.anything(),
      'create',
      homepage.uid
    );
    expect(permissions.assertEntry).not.toHaveBeenCalled();
    expect(contentAPI.validate.input.mock.calls[0][2]).toMatchObject({
      action: 'update',
      creates: true,
    });
    expect(contentAPI.validate.input.mock.calls[0][2]).not.toHaveProperty('documentId');
    expect(documents.create).toHaveBeenCalledWith({
      status: 'draft',
      data: { title: 't', sanitized: true },
    });
  });

  it('update the existing document after the stored entry is checked', async () => {
    const { strapi, documents, permissions, contentAPI } = makeStrapi({ active: true });
    permissions.resolveWriteStatus.mockResolvedValue({
      status: 'draft',
      publishAfterCreate: false,
    });
    const fields = mutationsOf(
      createSingleMutations({ strapi } as any),
      'buildSingleTypeMutations',
      homepage
    );

    await fields.updateX.resolve({}, { data: { title: 't' } }, context(), info);

    expect(permissions.assertEntry).toHaveBeenCalledWith(
      expect.anything(),
      'update',
      homepage.uid,
      'doc',
      { locale: undefined }
    );
    expect(contentAPI.validate.input.mock.calls[0][2]).toMatchObject({
      action: 'update',
      documentId: 'doc',
    });
    expect(documents.update).toHaveBeenCalledWith({
      documentId: 'doc',
      status: 'draft',
      data: { title: 't', sanitized: true },
    });
  });

  it("delete the document only when it is the caller's", async () => {
    const { strapi, documents, permissions } = makeStrapi({ active: true });
    const fields = mutationsOf(
      createSingleMutations({ strapi } as any),
      'buildSingleTypeMutations',
      homepage
    );

    await fields.deleteX.resolve({}, {}, context());

    expect(permissions.assertEntry).toHaveBeenCalledWith(
      expect.anything(),
      'delete',
      homepage.uid,
      'doc',
      { locale: undefined }
    );
    expect(documents.delete).toHaveBeenCalledWith({ documentId: 'doc' });

    documents.delete.mockClear();
    permissions.assertEntry.mockRejectedValue(new Error('Not Found'));

    await expect(fields.deleteX.resolve({}, {}, context())).rejects.toThrow('Not Found');
    expect(documents.delete).not.toHaveBeenCalled();
  });
});

describe('query resolvers', () => {
  it('validate and sanitize the query by the read action, and sanitize the output only for a subject-aware caller', async () => {
    for (const active of [false, true]) {
      const { strapi, contentAPI } = makeStrapi({ active });
      const { findMany, findOne, findFirst } = createQueryResolvers({
        strapi,
      } as any).buildQueriesResolvers({ contentType: article });
      const ctx = context();

      await findMany({}, { status: 'draft', locale: 'fr' }, ctx);
      await findOne({}, { documentId: 'a' }, ctx);
      await findFirst({}, {}, ctx);

      expect(contentAPI.validate.query.mock.calls.map((call: any[]) => call[2].action)).toEqual([
        'find',
        'findOne',
        'find',
      ]);
      expect(contentAPI.sanitize.query.mock.calls.map((call: any[]) => call[2].action)).toEqual([
        'find',
        'findOne',
        'find',
      ]);

      if (!active) {
        expect(contentAPI.sanitize.output).not.toHaveBeenCalled();
      } else {
        expect(contentAPI.sanitize.output.mock.calls[0][2]).toEqual({
          auth: ctx.state.auth,
          action: 'find',
          status: 'draft',
          locale: 'fr',
        });
        expect(contentAPI.sanitize.output.mock.calls[1][2]).toMatchObject({
          action: 'findOne',
          status: 'published',
        });
      }
    }
  });

  it('leave a missing entry missing', async () => {
    const { strapi, documents, contentAPI } = makeStrapi({ active: true });
    documents.findOne.mockResolvedValue(null as any);
    const { findOne } = createQueryResolvers({ strapi } as any).buildQueriesResolvers({
      contentType: article,
    });

    expect(await findOne({}, { documentId: 'gone' }, context())).toBeNull();
    expect(contentAPI.sanitize.output).not.toHaveBeenCalled();
  });
});

describe('association resolver', () => {
  const resolverFor = (strapi: any) =>
    createAssociationResolvers({ strapi } as any).buildAssociationResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'tags',
    });

  const withRoot = (rootArgs: Record<string, unknown> | undefined, ctx = context()) => {
    ctx.rootQueryArgsByPath = new Map(
      rootArgs ? [['root', { ...rootArgs, _originField: 'articles' }]] : []
    );

    return ctx;
  };

  it('puts the status inherited from the root in the query the drafts gate and the conditions see', async () => {
    const { strapi, contentAPI } = makeStrapi({ active: true });
    const ctx = withRoot({ status: 'draft' });

    await resolverFor(strapi)({ id: 1 }, {}, ctx, info);

    expect(contentAPI.validate.query).toHaveBeenCalledWith({ status: 'draft' }, tag, {
      auth: ctx.state.auth,
      action: 'find',
    });
    expect(contentAPI.sanitize.query).toHaveBeenCalledWith({ status: 'draft' }, tag, {
      auth: ctx.state.auth,
      action: 'find',
    });
  });

  it('puts the inherited publication filter in too, and no key for a status that is not set', async () => {
    const { strapi, contentAPI } = makeStrapi({ active: true });

    await resolverFor(strapi)(
      { id: 1 },
      {},
      withRoot({ hasPublishedVersion: true, status: null }),
      info
    );

    // A null status reads as published at the root (`|| 'published'`), so the gate sees published
    expect(contentAPI.validate.query.mock.calls[0][0]).toEqual({
      status: 'published',
      publicationFilter: 'has-published-version-document',
    });

    contentAPI.validate.query.mockClear();

    // A custom resolver's root inherits nothing: the target is read published, never drafts the
    // caller was not asked about
    await resolverFor(strapi)({ id: 1 }, {}, withRoot(undefined), info);

    expect(contentAPI.validate.query.mock.calls[0][0]).toEqual({ status: 'published' });
  });

  it('reads published under a custom resolver root for a caller that is not subject-aware only as before (no status)', async () => {
    const { strapi, query } = makeStrapi({ active: false });

    await resolverFor(strapi)({ id: 1 }, {}, withRoot(undefined), info);

    // No inherited status, no default: the load is what it always was
    expect((query.load.mock.calls[0] as unknown[])[2]).not.toHaveProperty('where');
  });

  it('lets the drafts gate refuse a draft read of the target before anything is loaded', async () => {
    const { strapi, contentAPI, query } = makeStrapi({ active: true });
    contentAPI.validate.query.mockRejectedValue(new Error('DRAFT_READ_FORBIDDEN'));

    await expect(
      resolverFor(strapi)({ id: 1 }, {}, withRoot({ status: 'draft' }), info)
    ).rejects.toThrow('DRAFT_READ_FORBIDDEN');
    expect(query.load).not.toHaveBeenCalled();
  });

  it('keeps the inherited status out of the load and applies it as before', async () => {
    const { strapi, query } = makeStrapi({ active: true });

    await resolverFor(strapi)({ id: 1 }, {}, withRoot({ status: 'draft' }), info);

    expect(query.load).toHaveBeenCalledWith({ id: 1 }, 'tags', {
      where: { publishedAt: { $null: true } },
    });
  });

  it('reads the relations of a mutation response in the version the mutation returned', async () => {
    const { strapi, contentAPI } = makeStrapi({ active: true });
    const ctx = context();
    ctx.writeScopeByPath = new Map([['root', { status: 'draft' }]]);

    await resolverFor(strapi)({ id: 1 }, {}, ctx, info);

    expect(contentAPI.validate.query.mock.calls[0][0]).toEqual({ status: 'draft' });
  });

  it('sanitizes the loaded relation by the target find rules, in the status it was read in', async () => {
    const { strapi, contentAPI, query } = makeStrapi({ active: true });
    query.load.mockResolvedValue([{ documentId: 't1', publishedAt: null }] as any);
    const ctx = withRoot({ status: 'draft', locale: 'fr' });

    const result = await resolverFor(strapi)({ id: 1 }, {}, ctx, info);

    expect(contentAPI.sanitize.output).toHaveBeenCalledWith(
      [{ documentId: 't1', publishedAt: null }],
      tag,
      {
        auth: ctx.state.auth,
        action: 'find',
        status: 'draft',
        locale: 'fr',
      }
    );
    expect(result).toEqual({ nodes: [{ documentId: 't1', publishedAt: null }] });
  });

  it('gives a caller that is not subject-aware the query and the data it had', async () => {
    const { strapi, contentAPI, query } = makeStrapi({ active: false });
    const ctx = withRoot({ status: 'draft' });

    await resolverFor(strapi)({ id: 1 }, {}, ctx, info);

    expect(contentAPI.validate.query.mock.calls[0][0]).toEqual({});
    expect(contentAPI.sanitize.output).not.toHaveBeenCalled();
    expect(query.load).toHaveBeenCalledWith({ id: 1 }, 'tags', {
      where: { publishedAt: { $null: true } },
    });
  });
});

/** What the output rules do to an entry: take out the top-level keys `hidden` names */
const hideFields = (contentAPI: any, ...hidden: string[]) => {
  contentAPI.sanitize.output.mockImplementation(async (data: any) => {
    const strip = (entry: any) =>
      Object.fromEntries(Object.entries(entry).filter(([key]) => !hidden.includes(key)));

    return Array.isArray(data) ? data.map(strip) : strip(data);
  });
};

describe('nested resolvers and the fields of the parent', () => {
  const withParent = (parent: object) => parent;

  it('resolve a relation the rules hide on the parent to null, before the target is looked at', async () => {
    const { strapi, contentAPI, query } = makeStrapi({ active: true });
    hideFields(contentAPI, 'tags');

    const resolve = createAssociationResolvers({ strapi } as any).buildAssociationResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'tags',
    });

    expect(await resolve(withParent({ id: 1, documentId: 'a' }), {}, context(), info)).toBeNull();
    expect(contentAPI.validate.query).not.toHaveBeenCalled();
    expect(query.load).not.toHaveBeenCalled();
  });

  it('read a relation the rules let through, asking the rules about the parent once for all its fields', async () => {
    const { strapi, contentAPI, query } = makeStrapi({ active: true });
    hideFields(contentAPI, 'seo');
    const parent = withParent({ id: 1, documentId: 'a' });
    const ctx = context();

    const resolve = createAssociationResolvers({ strapi } as any).buildAssociationResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'tags',
    });
    await resolve(parent, {}, ctx, info);

    expect(query.load).toHaveBeenCalledTimes(1);

    // The same entry's component is hidden, and the answer came from the same call
    const component = createComponentResolvers({ strapi } as any).buildComponentResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'seo',
    });
    const before = contentAPI.sanitize.output.mock.calls.length;

    expect(await component(parent, {}, ctx)).toBeNull();
    expect(contentAPI.sanitize.output.mock.calls.length).toBe(before);
  });

  it('resolve a component the rules hide on the parent to null, and load nothing', async () => {
    const { strapi, contentAPI, query } = makeStrapi({ active: true });
    hideFields(contentAPI, 'seo');

    const resolve = createComponentResolvers({ strapi } as any).buildComponentResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'seo',
    });

    expect(await resolve(withParent({ id: 1, documentId: 'a' }), {}, context())).toBeNull();
    expect(query.load).not.toHaveBeenCalled();
  });

  it('read a component the rules let through, sanitized by the rules of the parent', async () => {
    const { strapi, contentAPI, query } = makeStrapi({ active: true });
    query.load.mockResolvedValue([{ id: 9, metaTitle: 'x' }] as any);
    const resolve = createComponentResolvers({ strapi } as any).buildComponentResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'seo',
    });

    const rows = await resolve(withParent({ id: 1, documentId: 'a' }), {}, context());

    expect(rows).toEqual([{ id: 9, metaTitle: 'x' }]);
    // Once for the parent's own fields, once for the rows, wrapped in the entry they belong to
    expect(contentAPI.sanitize.output.mock.calls.at(-1)![0]).toEqual({
      id: 1,
      documentId: 'a',
      seo: [{ id: 9, metaTitle: 'x' }],
    });
    expect(contentAPI.sanitize.output.mock.calls.at(-1)![1]).toBe(article);
  });

  it('resolve a dynamic zone the rules hide on the parent to null, and load nothing', async () => {
    const { strapi, contentAPI, query } = makeStrapi({ active: true });
    hideFields(contentAPI, 'blocks');

    const resolve = createDynamicZoneResolvers({ strapi } as any).buildDynamicZoneResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'blocks',
    });

    expect(await resolve(withParent({ id: 1, documentId: 'a' }), {}, context())).toBeNull();
    expect(query.load).not.toHaveBeenCalled();
  });

  it('read a dynamic zone the rules let through, sanitized by the rules of the parent', async () => {
    const { strapi, contentAPI, query } = makeStrapi({ active: true });
    query.load.mockResolvedValue([{ id: 2, __component: 'shared.seo' }] as any);
    const resolve = createDynamicZoneResolvers({ strapi } as any).buildDynamicZoneResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'blocks',
    });

    expect(await resolve(withParent({ id: 1, documentId: 'a' }), {}, context())).toEqual([
      { id: 2, __component: 'shared.seo' },
    ]);
    expect(contentAPI.sanitize.output.mock.calls.at(-1)![0]).toEqual({
      id: 1,
      documentId: 'a',
      blocks: [{ id: 2, __component: 'shared.seo' }],
    });
  });

  it('give a caller that is not subject-aware the component and the zone as they were', async () => {
    const { strapi, contentAPI, query } = makeStrapi({ active: false });
    query.load.mockResolvedValue([{ id: 9 }] as any);

    const component = createComponentResolvers({ strapi } as any).buildComponentResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'seo',
    });
    const zone = createDynamicZoneResolvers({ strapi } as any).buildDynamicZoneResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'blocks',
    });

    expect(await component({ id: 1 }, {}, context())).toEqual([{ id: 9 }]);
    expect(await zone({ id: 1 }, {}, context())).toEqual([{ id: 9 }]);
    expect(contentAPI.sanitize.output).not.toHaveBeenCalled();
  });

  it('resolve what is nested in a component row by the rules of the entry it belongs to', async () => {
    const { strapi, contentAPI, query } = makeStrapi({ active: true });
    query.load.mockResolvedValue([{ id: 9 }] as any);
    const ctx = context();
    const parent = withParent({ id: 1, documentId: 'a' });

    const component = createComponentResolvers({ strapi } as any).buildComponentResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'seo',
    });
    const [row] = (await component(parent, {}, ctx)) as any[];

    // The row's own relation: its parent is the row, and the question goes to the article's rules
    const resolve = createAssociationResolvers({ strapi } as any).buildAssociationResolver({
      contentTypeUID: 'shared.seo' as any,
      attributeName: 'owner',
    });

    contentAPI.sanitize.output.mockClear();
    await resolve(row, {}, ctx, info);

    expect(contentAPI.sanitize.output.mock.calls[0][0]).toEqual({
      id: 1,
      documentId: 'a',
      seo: [{ owner: null }],
    });
    expect(contentAPI.sanitize.output.mock.calls[0][1]).toBe(article);
  });

  it('read nothing nested in a component row no resolver output', async () => {
    const { strapi, query } = makeStrapi({ active: true });
    const resolve = createAssociationResolvers({ strapi } as any).buildAssociationResolver({
      contentTypeUID: 'shared.seo' as any,
      attributeName: 'owner',
    });

    expect(await resolve({ id: 5 }, {}, context(), info)).toBeNull();
    expect(query.load).not.toHaveBeenCalled();
  });
});

describe('populate depth on nested resolvers', () => {
  it("refuses a relation, component or zone beyond the root rows' depth with the REST error, before loading", async () => {
    const { strapi, permissions, query } = makeStrapi({ active: true });
    permissions.checker.populateDepth.mockReturnValue(0);
    const parent = { id: 1, documentId: 'a' };

    const association = createAssociationResolvers({ strapi } as any).buildAssociationResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'tags',
    });
    const component = createComponentResolvers({ strapi } as any).buildComponentResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'seo',
    });
    const zone = createDynamicZoneResolvers({ strapi } as any).buildDynamicZoneResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'blocks',
    });

    for (const resolve of [
      () => association(parent, {}, context(), info),
      () => component(parent, {}, context()),
      () => zone(parent, {}, context()),
    ]) {
      // eslint-disable-next-line no-await-in-loop
      await expect(resolve()).rejects.toThrow(
        'Populate depth 1 exceeds the limit of 0 for api::article.article'
      );
    }

    expect(query.load).not.toHaveBeenCalled();
    // Asked of the root's read action and type
    expect(permissions.checker.populateDepth).toHaveBeenCalledWith(
      expect.anything(),
      'find',
      ARTICLE
    );
  });

  it('counts one more level per relation and component below the root, against the root rows', async () => {
    const { strapi, permissions, query } = makeStrapi({ active: true });
    permissions.checker.populateDepth.mockReturnValue(1);
    query.load.mockResolvedValue([{ id: 9 }] as any);
    const ctx = context();

    const component = createComponentResolvers({ strapi } as any).buildComponentResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'seo',
    });
    // Level 1: within the limit
    const [row] = (await component({ id: 1, documentId: 'a' }, {}, ctx)) as any[];

    // Level 2: the row's own relation
    const owner = createAssociationResolvers({ strapi } as any).buildAssociationResolver({
      contentTypeUID: 'shared.seo' as any,
      attributeName: 'owner',
    });

    await expect(owner(row, {}, ctx, info)).rejects.toThrow(
      'Populate depth 2 exceeds the limit of 1 for api::article.article'
    );
  });

  it('asks nothing of the depth for a caller that is not subject-aware', async () => {
    const { strapi, permissions } = makeStrapi({ active: false });
    permissions.checker.populateDepth.mockReturnValue(0);

    const association = createAssociationResolvers({ strapi } as any).buildAssociationResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'tags',
    });

    await association({ id: 1 }, {}, context(), info);

    expect(permissions.checker.populateDepth).not.toHaveBeenCalled();
  });
});

describe('arguments of a repeatable component', () => {
  it('judges filters and sort as a populate node of the root entry, by its action and scope', async () => {
    const { strapi, contentAPI, query } = makeStrapi({ active: true });
    const ctx = context();
    const resolve = createComponentResolvers({ strapi } as any).buildComponentResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'seo',
    });
    const node = { filters: { metaTitle: { $eq: 'x' } }, sort: ['metaTitle'] };

    await resolve({ id: 1, documentId: 'a' }, node, ctx);

    expect(contentAPI.validate.query).toHaveBeenCalledWith({ populate: { seo: node } }, article, {
      auth: ctx.state.auth,
      action: 'find',
    });
    expect(contentAPI.sanitize.query).toHaveBeenCalledWith({ populate: { seo: node } }, article, {
      auth: ctx.state.auth,
      action: 'find',
    });
    expect((query.load.mock.calls[0] as unknown[])[2]).toEqual(node);
  });

  it('loads with what sanitizing the root node left, and nothing when it removed the filters', async () => {
    const { strapi, contentAPI, query } = makeStrapi({ active: true });
    contentAPI.sanitize.query.mockImplementation(async (q: any) =>
      q.populate ? { populate: { seo: { sort: ['metaTitle'] } } } : q
    );
    const resolve = createComponentResolvers({ strapi } as any).buildComponentResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'seo',
    });

    await resolve(
      { id: 1, documentId: 'a' },
      { filters: { secret: { $eq: 'x' } }, sort: ['metaTitle'] },
      context()
    );

    expect((query.load.mock.calls[0] as unknown[])[2]).toEqual({ sort: ['metaTitle'] });
  });

  it('places a component of a component row under its path from the root', async () => {
    const { strapi, contentAPI, query } = makeStrapi({ active: true });
    query.load.mockResolvedValue([{ id: 9, __component: 'shared.seo' }] as any);
    const ctx = context();

    const zone = createDynamicZoneResolvers({ strapi } as any).buildDynamicZoneResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'blocks',
    });
    const [row] = (await zone({ id: 1, documentId: 'a' }, {}, ctx)) as any[];

    const nested = createComponentResolvers({ strapi } as any).buildComponentResolver({
      contentTypeUID: 'shared.seo' as any,
      attributeName: 'items',
    });
    strapi.getModel = ((uid: string) =>
      uid === 'shared.seo'
        ? {
            ...seo,
            attributes: {
              ...seo.attributes,
              items: { type: 'component', component: 'shared.seo', repeatable: true },
            },
          }
        : ({ [NOTE]: note, [ARTICLE]: article, [TAG]: tag } as any)[uid]) as any;

    contentAPI.validate.query.mockClear();
    await nested(row, { filters: { metaTitle: { $eq: 'x' } } }, ctx);

    expect(contentAPI.validate.query.mock.calls[0][0]).toEqual({
      populate: {
        blocks: {
          on: {
            'shared.seo': { populate: { items: { filters: { metaTitle: { $eq: 'x' } } } } },
          },
        },
      },
    });
    expect(contentAPI.validate.query.mock.calls[0][1]).toBe(article);
  });

  it('judges the arguments of a caller that is not subject-aware on the component, as before', async () => {
    const { strapi, contentAPI } = makeStrapi({ active: false });
    const resolve = createComponentResolvers({ strapi } as any).buildComponentResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'seo',
    });

    await resolve({ id: 1 }, { filters: { metaTitle: { $eq: 'x' } } }, context());

    expect(contentAPI.validate.query.mock.calls[0][1]).toBe(seo);
  });
});

describe('the selection set of a mutation and the drafts gate', () => {
  const field = (name: string, selections: any[] = []) => ({
    kind: 'Field',
    name: { value: name },
    ...(selections.length > 0 ? { selectionSet: { selections } } : {}),
  });
  const infoSelecting = (...selections: any[]) => ({
    path: { key: 'root' },
    fieldNodes: [{ kind: 'Field', name: { value: 'updateX' }, selectionSet: { selections } }],
    fragments: {},
  });

  it('refuses a draft write whose response selects relations the caller may not read drafts of, before writing', async () => {
    const { strapi, documents, permissions } = makeStrapi({ active: true });
    permissions.resolveWriteStatus.mockResolvedValue({
      status: 'draft',
      publishAfterCreate: false,
    });
    // Drafts of the related type are not the caller's to read
    permissions.checker.canReadDrafts.mockReturnValue(false);
    strapi.getModel = (uid: string) => ({ [ARTICLE]: article, [TAG]: tag })[uid] as any;
    const fields = mutationsOf(
      createCollectionMutations({ strapi } as any),
      'buildCollectionTypeMutations',
      article
    );

    await expect(
      fields.updateX.resolve(
        {},
        { documentId: 'd', data: {} },
        context(),
        infoSelecting(
          field('title'),
          field('tags_connection', [field('nodes', [field('documentId')])])
        )
      )
    ).rejects.toThrow();
    expect(documents.update).not.toHaveBeenCalled();
  });

  it('lets the write through when the response selects no such relation, or the write is published', async () => {
    const { strapi, documents, permissions } = makeStrapi({ active: true });
    permissions.checker.canReadDrafts.mockReturnValue(false);
    strapi.getModel = (uid: string) => ({ [ARTICLE]: article, [TAG]: tag })[uid] as any;
    const fields = mutationsOf(
      createCollectionMutations({ strapi } as any),
      'buildCollectionTypeMutations',
      article
    );

    permissions.resolveWriteStatus.mockResolvedValue({
      status: 'draft',
      publishAfterCreate: false,
    });
    await fields.updateX.resolve(
      {},
      { documentId: 'd', data: {} },
      context(),
      infoSelecting(field('title'))
    );

    permissions.resolveWriteStatus.mockResolvedValue({
      status: 'published',
      publishAfterCreate: false,
    });
    await fields.updateX.resolve(
      {},
      { documentId: 'd', data: {} },
      context(),
      infoSelecting(field('tags', [field('documentId')]))
    );

    expect(documents.update).toHaveBeenCalledTimes(2);
  });
});

describe('polymorphic relations', () => {
  const morph = (strapi: any) =>
    createAssociationResolvers({ strapi } as any).buildAssociationResolver({
      contentTypeUID: ARTICLE as any,
      attributeName: 'related',
    });

  it('are refused for a subject-aware caller, before any query is validated or loaded', async () => {
    const { strapi, contentAPI, query } = makeStrapi({ active: true });

    await expect(morph(strapi)({ id: 1, documentId: 'a' }, {}, context(), info)).rejects.toThrow(
      'Reading a polymorphic relation is not allowed'
    );
    expect(contentAPI.validate.query).not.toHaveBeenCalled();
    expect(query.load).not.toHaveBeenCalled();
  });

  it('still answer null when the rules hide the field of the parent, not an error', async () => {
    const { strapi, contentAPI } = makeStrapi({ active: true });
    hideFields(contentAPI, 'related');

    expect(await morph(strapi)({ id: 1, documentId: 'a' }, {}, context(), info)).toBeNull();
  });

  it('are left as they were for a caller that is not subject-aware', async () => {
    const { strapi, contentAPI } = makeStrapi({ active: false });

    await morph(strapi)({ id: 1 }, {}, context(), info).catch(() => {});

    expect(contentAPI.validate.query).toHaveBeenCalledTimes(1);
  });
});
