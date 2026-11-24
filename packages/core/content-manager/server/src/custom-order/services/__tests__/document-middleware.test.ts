import { createDocumentMiddleware } from '../document-middleware';

const UID = 'api::article.article';

type CustomOrder = Parameters<typeof createDocumentMiddleware>[0];

const createCustomOrder = ({ isEnabled = true, isOrderable = true } = {}) => ({
  isOrderable: jest.fn(() => isOrderable),
  isEnabled: jest.fn(() => isEnabled),
  getTopPosition: jest.fn(async () => -4),
  syncDocumentPosition: jest.fn(async () => {}),
  withOrderLock: jest.fn(async (_uid: string, fn: () => Promise<unknown>) => fn()),
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
  const returned = await createDocumentMiddleware(customOrder as unknown as CustomOrder)(
    context as any,
    next as any
  );

  return { context, next, returned };
};

describe('Custom order | document middleware', () => {
  test('leaves content types that cannot be ordered alone', async () => {
    const customOrder = createCustomOrder({ isOrderable: false });
    const params = { data: { title: 'A', strapi_position: 99 } };

    const { context, next } = await run(customOrder, 'create', params);

    expect(context.params).toBe(params);
    expect(next).toHaveBeenCalledTimes(1);
    expect(customOrder.isEnabled).not.toHaveBeenCalled();
  });

  test('leaves content types without custom order alone', async () => {
    const customOrder = createCustomOrder({ isEnabled: false });
    const params = { data: { title: 'A' } };

    const findMany = await run(customOrder, 'findMany', {});
    const create = await run(customOrder, 'create', params);

    expect(findMany.context.params).toEqual({});
    expect(create.context.params).toBe(params);
    expect(customOrder.getTopPosition).not.toHaveBeenCalled();
  });

  test.each(['create', 'clone', 'update'])(
    '%s drops the position from the data even while custom order is off',
    async (action) => {
      const customOrder = createCustomOrder({ isEnabled: false });
      const params = { documentId: 'doc', data: { title: 'A', strapi_position: 99 } };

      const { context, next } = await run(customOrder, action, params);

      expect(context.params).toEqual({ documentId: 'doc', data: { title: 'A' } });
      expect(next).toHaveBeenCalledTimes(1);
      // The params of the caller are not mutated
      expect(params.data.strapi_position).toBe(99);
    }
  );

  test.each(['findMany', 'findFirst'])('%s sorts by position by default', async (action) => {
    const { context, next } = await run(createCustomOrder(), action, { filters: { a: 1 } });

    expect(context.params).toEqual({
      filters: { a: 1 },
      sort: { strapi_position: 'asc', id: 'desc' },
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  test.each(['title:asc', ['title:asc'], { title: 'asc' }])(
    'findMany keeps the requested sort %p',
    async (sort) => {
      const { context } = await run(createCustomOrder(), 'findMany', { sort });

      expect(context.params).toEqual({ sort });
      expect(context.params.sort).toBe(sort);
    }
  );

  test.each([
    ['strapi_position:ASC', 'strapi_position:ASC,id:desc'],
    ['strapi_position:desc', 'strapi_position:desc,id:asc'],
    [
      ['title:asc', 'strapi_position:asc'],
      ['title:asc', 'strapi_position:asc', 'id:desc'],
    ],
    [{ strapi_position: 'DESC' }, { strapi_position: 'DESC', id: 'asc' }],
    [
      [{ title: 'asc' }, { strapi_position: 'asc' }],
      [{ title: 'asc' }, { strapi_position: 'asc' }, { id: 'desc' }],
    ],
  ])('findMany completes a sort on the position %p with the id', async (sort, expected) => {
    const { context } = await run(createCustomOrder(), 'findMany', { sort });

    expect(context.params).toEqual({ sort: expected });
  });

  test('count is not sorted', async () => {
    const { context } = await run(createCustomOrder(), 'count', {});

    expect(context.params).toEqual({});
  });

  test.each(['create', 'clone'])('%s puts the document on top, under the lock', async (action) => {
    const customOrder = createCustomOrder();
    const params = { data: { title: 'A', strapi_position: 99 } };
    let paramsWhenCreating: unknown;
    const next = jest.fn(async () => {
      expect(customOrder.withOrderLock).toHaveBeenCalledTimes(1);
      return null;
    });
    const context = { uid: UID, action, params };

    customOrder.withOrderLock.mockImplementationOnce(async (_uid, fn) => {
      // The top position is only read once the lock is held
      expect(customOrder.getTopPosition).not.toHaveBeenCalled();
      const result = await fn();
      paramsWhenCreating = context.params;
      return result;
    });

    await createDocumentMiddleware(customOrder as unknown as CustomOrder)(
      context as any,
      next as any
    );

    expect(customOrder.withOrderLock).toHaveBeenCalledWith(UID, expect.any(Function));
    expect(paramsWhenCreating).toEqual({ data: { title: 'A', strapi_position: -4 } });
    expect(next).toHaveBeenCalledTimes(1);
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
