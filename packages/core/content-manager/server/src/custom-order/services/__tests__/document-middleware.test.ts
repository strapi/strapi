import { createDocumentMiddleware } from '../document-middleware';

const UID = 'api::article.article';

const createCustomOrder = ({ isEnabled = true } = {}) => ({
  isEnabled: jest.fn(() => isEnabled),
  getTopPosition: jest.fn(async () => -4),
  syncDocumentPosition: jest.fn(async () => {}),
});

const run = async (
  customOrder: ReturnType<typeof createCustomOrder>,
  action: string,
  params: Record<string, unknown>,
  result: unknown = null
) => {
  const context = { uid: UID, action, params };
  const next = jest.fn(async () => result);

  // The context of a document middleware is a union of every action, too wide for a test
  const returned = await createDocumentMiddleware(customOrder)(context as any, next as any);

  return { context, next, returned };
};

describe('Custom order | document middleware', () => {
  test('leaves content types without custom order alone', async () => {
    const customOrder = createCustomOrder({ isEnabled: false });
    const params = { data: { title: 'A' } };

    const findMany = await run(customOrder, 'findMany', {});
    const create = await run(customOrder, 'create', params);

    expect(findMany.context.params).toEqual({});
    expect(create.context.params).toBe(params);
    expect(customOrder.getTopPosition).not.toHaveBeenCalled();
  });

  test.each(['findMany', 'findFirst'])('%s sorts by position by default', async (action) => {
    const { context, next } = await run(createCustomOrder(), action, { filters: { a: 1 } });

    expect(context.params).toEqual({ filters: { a: 1 }, sort: { strapi_position: 'asc' } });
    expect(next).toHaveBeenCalledTimes(1);
  });

  test.each(['title:asc', ['title:asc'], { title: 'asc' }])(
    'findMany keeps the requested sort %p',
    async (sort) => {
      const { context } = await run(createCustomOrder(), 'findMany', { sort });

      expect(context.params).toEqual({ sort });
    }
  );

  test('count is not sorted', async () => {
    const { context } = await run(createCustomOrder(), 'count', {});

    expect(context.params).toEqual({});
  });

  test.each(['create', 'clone'])('%s puts the document on top', async (action) => {
    const customOrder = createCustomOrder();
    const params = { data: { title: 'A', strapi_position: 99 } };

    const { context } = await run(customOrder, action, params);

    expect(context.params).toEqual({ data: { title: 'A', strapi_position: -4 } });
    // The params of the caller are not mutated
    expect(params.data.strapi_position).toBe(99);
  });

  test('update ignores a position passed in the data', async () => {
    const customOrder = createCustomOrder();

    const { context } = await run(
      customOrder,
      'update',
      { documentId: 'doc', data: { title: 'A', strapi_position: 99 } },
      { documentId: 'doc', strapi_position: 3 }
    );

    expect(context.params).toEqual({ documentId: 'doc', data: { title: 'A' } });
    expect(customOrder.syncDocumentPosition).not.toHaveBeenCalled();
  });

  test('update gives the position of the document to a new locale', async () => {
    const customOrder = createCustomOrder();
    const entry = { documentId: 'doc', locale: 'fr', strapi_position: null };

    const { returned } = await run(
      customOrder,
      'update',
      { documentId: 'doc', locale: 'fr', data: { title: 'A' } },
      entry
    );

    expect(customOrder.syncDocumentPosition).toHaveBeenCalledWith(UID, 'doc');
    expect(returned).toBe(entry);
  });

  test('update does nothing more when the document does not exist', async () => {
    const customOrder = createCustomOrder();

    await run(customOrder, 'update', { documentId: 'doc', data: {} }, null);

    expect(customOrder.syncDocumentPosition).not.toHaveBeenCalled();
  });
});
