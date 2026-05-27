import { createEntityManager } from '../index';
import { createQueryBuilder } from '../../query';

jest.mock('../../query', () => ({
  createQueryBuilder: jest.fn(),
}));

describe('entity-manager deleteMany', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the query builder with filter params only', async () => {
    const init = jest.fn().mockReturnThis();
    const deleteFn = jest.fn().mockReturnThis();
    const execute = jest.fn().mockResolvedValue(2);

    (createQueryBuilder as jest.Mock).mockReturnValue({
      init,
      delete: deleteFn,
      execute,
    });

    const db = {
      lifecycles: {
        run: jest.fn(async () => undefined),
      },
    } as any;

    const em = createEntityManager(db);
    const params = { where: { author: { id: 1 } } };

    const result = await em.deleteMany('api::test.test', params);

    expect(createQueryBuilder).toHaveBeenCalledWith('api::test.test', db);
    expect(init).toHaveBeenCalledWith({ where: { author: { id: 1 } } });
    expect(deleteFn).toHaveBeenCalled();
    expect(execute).toHaveBeenCalledWith({ mapResults: false });
    expect(result).toEqual({ count: 2 });
  });

  it('ignores pagination and populate params (same pick set as count)', async () => {
    const init = jest.fn().mockReturnThis();
    const deleteFn = jest.fn().mockReturnThis();
    const execute = jest.fn().mockResolvedValue(1);

    (createQueryBuilder as jest.Mock).mockReturnValue({
      init,
      delete: deleteFn,
      execute,
    });

    const db = {
      lifecycles: {
        run: jest.fn(async () => undefined),
      },
    } as any;

    const em = createEntityManager(db);
    const params = {
      where: { name: 'foo' },
      filters: { published: true },
      _q: 'search',
      limit: 1,
      offset: 2,
      orderBy: { name: 'asc' },
      populate: ['author'],
      select: ['name'],
    };

    await em.deleteMany('api::test.test', params);

    expect(init).toHaveBeenCalledWith({
      _q: 'search',
      where: { name: 'foo' },
      filters: { published: true },
    });
  });
});
