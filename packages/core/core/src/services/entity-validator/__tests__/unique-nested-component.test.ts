import entityValidator from '..';

describe('Entity validator - unique field in a nested component', () => {
  const metaModel = {
    modelType: 'component',
    uid: 'default.meta',
    globalId: 'ComponentDefaultMeta',
    attributes: { slug: { type: 'string', unique: true } },
  };

  const entryModel = {
    modelType: 'component',
    uid: 'default.entry',
    globalId: 'ComponentDefaultEntry',
    attributes: { meta: { type: 'component', component: 'default.meta', repeatable: false } },
  };

  const model: any = {
    modelType: 'contentType',
    uid: 'api::test.test',
    kind: 'collectionType',
    modelName: 'test',
    globalId: 'test',
    info: { displayName: 'Test', singularName: 'test', pluralName: 'tests' },
    options: {},
    attributes: { entries: { type: 'component', component: 'default.entry', repeatable: true } },
  };

  const models: Record<string, any> = {
    'api::test.test': model,
    'default.entry': entryModel,
    'default.meta': metaModel,
  };

  beforeEach(() => {
    global.strapi = {
      getModel: (uid: string) => models[uid],
      db: { query: () => ({ findOne: async () => null }) },
    } as any;
  });

  it('does not crash when a repeatable item has a null nested component', async () => {
    // The second entry has a `null` nested `meta` component, so the path
    // `meta.slug` used by the unique validator hits `null.slug`. (#23690)
    const input = { entries: [{ meta: { slug: 'a' } }, { meta: null }] };

    await expect(
      entityValidator.validateEntityCreation(model, input as any)
    ).resolves.toBeDefined();
  });
});
