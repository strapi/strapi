import { createEntityManager } from '../index';
import { createQueryBuilder } from '../../query';

jest.mock('../../query', () => ({
  createQueryBuilder: jest.fn(),
}));

// Call-shape lock. Behavior: tests/api/core/database/db.test.api.js (count === 1, was 3).
describe('entity-manager updateMany', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createDb = () =>
    ({
      metadata: {
        get: jest.fn().mockReturnValue({
          attributes: {
            name: { type: 'string' },
          },
        }),
      },
      dialect: {
        usesForeignKeys() {
          return false;
        },
      },
      lifecycles: {
        run: jest.fn(async () => undefined),
      },
    }) as any;

  it('initializes the query builder with filter params only', async () => {
    const init = jest.fn().mockReturnThis();
    const update = jest.fn().mockReturnThis();
    const execute = jest.fn().mockResolvedValue(2);

    (createQueryBuilder as jest.Mock).mockReturnValue({
      init,
      update,
      execute,
    });

    const em = createEntityManager(createDb());
    const params = { where: { author: { id: 1 } }, data: { name: 'updated' } };

    const result = await em.updateMany('api::test.test', params);

    expect(createQueryBuilder).toHaveBeenCalledWith('api::test.test', expect.anything());
    expect(init).toHaveBeenCalledWith({ where: { author: { id: 1 } } });
    expect(update).toHaveBeenCalledWith({ name: 'updated' });
    expect(execute).toHaveBeenCalledWith({ mapResults: false });
    expect(result).toEqual({ count: 2 });
  });

  it('ignores pagination and populate params (same pick set as count)', async () => {
    const init = jest.fn().mockReturnThis();
    const update = jest.fn().mockReturnThis();
    const execute = jest.fn().mockResolvedValue(1);

    (createQueryBuilder as jest.Mock).mockReturnValue({
      init,
      update,
      execute,
    });

    const em = createEntityManager(createDb());
    const params = {
      where: { name: 'foo' },
      filters: { published: true },
      _q: 'search',
      data: { name: 'updated' },
      limit: 1,
      offset: 2,
      orderBy: { name: 'asc' },
      populate: ['author'],
      select: ['name'],
    };

    await em.updateMany('api::test.test', params);

    expect(init).toHaveBeenCalledWith({
      _q: 'search',
      where: { name: 'foo' },
      filters: { published: true },
    });
  });
});
