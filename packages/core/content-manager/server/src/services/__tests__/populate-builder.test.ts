import createPopulateBuilder from '../populate-builder';

const uid = 'api::article.article';

const fakeModels = {
  [uid]: {
    uid,
    attributes: {
      title: { type: 'string' },
      author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
      cover: { type: 'media' },
    },
  },
  'api::author.author': {
    uid: 'api::author.author',
    attributes: {
      name: { type: 'string' },
    },
  },
} as any;

describe('populate-builder service', () => {
  const populateBuilder = createPopulateBuilder();

  beforeEach(() => {
    global.strapi = {
      getModel: jest.fn((modelUid) => fakeModels[modelUid]),
      db: {
        metadata: {
          get: jest.fn((modelUid) => ({ ...fakeModels[modelUid], columnToAttribute: {} })),
        },
      },
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('build resolves to undefined without query or deep population', async () => {
    await expect(populateBuilder(uid).build()).resolves.toBeUndefined();
  });

  test('build resolves to an object for populateDeep(2)', async () => {
    const populate = await populateBuilder(uid).populateDeep(2).build();

    expect(populate).toEqual({ author: true, cover: { populate: { folder: true } } });
  });

  test("build resolves to an object when the query populate is '*'", async () => {
    const populate = await populateBuilder(uid).populateFromQuery({ populate: '*' }).build();

    expect(populate).toEqual({});
  });

  test('build resolves to an object when the query populate is an array', async () => {
    const populate = await populateBuilder(uid)
      .populateFromQuery({ populate: ['author'] })
      .build();

    expect(populate).toEqual({});
  });

  test('build resolves to an object combining a query populate and populateDeep(2)', async () => {
    const populate = await populateBuilder(uid)
      .populateFromQuery({ populate: '*', filters: { author: { name: 'a' } } })
      .populateDeep(2)
      .build();

    expect(typeof populate).toBe('object');
    expect(Array.isArray(populate)).toBe(false);
  });

  test('build resolves to the merged overrides', async () => {
    const populate = await populateBuilder(uid)
      .populateFromQuery({ filters: { author: { name: 'a' } } })
      .withPopulateOverride({ cover: { fields: ['url'] } })
      .build();

    expect(populate).toEqual({ author: {}, cover: { fields: ['url'] } });
  });
});
