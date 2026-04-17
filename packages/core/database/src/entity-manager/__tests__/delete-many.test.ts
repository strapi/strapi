import { createEntityManager } from '../index';
import { createQueryBuilder } from '../../query';

jest.mock('../../query', () => ({
  createQueryBuilder: jest.fn(),
}));

describe('entity-manager deleteMany', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses query builder init params to handle nested filters', async () => {
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
    expect(init).toHaveBeenCalledWith(params);
    expect(deleteFn).toHaveBeenCalled();
    expect(execute).toHaveBeenCalledWith({ mapResults: false });
    expect(result).toEqual({ count: 2 });
  });
});
