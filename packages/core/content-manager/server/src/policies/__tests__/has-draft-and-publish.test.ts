import hasDraftAndPublish from '../has-draft-and-publish';

describe('hasDraftAndPublish policy', () => {
  beforeEach(() => {
    global.strapi = {
      errors: {
        forbidden: jest.fn(() => 'forbidden'),
      },
      contentTypes: {
        foo: {
          options: {
            draftAndPublish: true,
          },
        },
        bar: {
          options: {
            draftAndPublish: false,
          },
        },
      },
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('It should succeed when the model has draft & publish enabled', () => {
    const ctx = { params: { model: 'foo' } } as any;
    const res = hasDraftAndPublish(ctx, {}, { strapi: global.strapi });

    expect(res).toBe(true);
  });

  test(`It should fail when the model has draft & publish disabled`, () => {
    const ctx = { params: { model: 'bar' } } as any;

    const res = hasDraftAndPublish(ctx, {}, { strapi: global.strapi });
    expect(res).toBe(false);
  });

  test(`It should fail when the model doesn't exists`, () => {
    const ctx = { params: { model: 'foobar' } } as any;

    const res = hasDraftAndPublish(ctx, {}, { strapi: global.strapi });
    expect(res).toBe(false);
  });

  test(`It should fail when params.model isn't provided`, () => {
    const ctx = { params: {} } as any;

    const res = hasDraftAndPublish(ctx, {}, { strapi: global.strapi });
    expect(res).toBe(false);
  });
});
