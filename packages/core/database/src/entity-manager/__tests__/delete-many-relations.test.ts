import { createEntityManager } from '..';

describe('deleteMany', () => {
  test('cleans up relations for each deleted entity', async () => {
    const commitMock = jest.fn();
    const rollbackMock = jest.fn();
    const transactionMock = jest.fn().mockResolvedValue({
      get: () => 'trx',
      commit: commitMock,
      rollback: rollbackMock,
    });

    const executeMock = jest.fn();
    const initMock = jest.fn().mockReturnValue({ execute: executeMock });
    const deleteMock = jest.fn().mockReturnValue({ execute: executeMock });
    const whereMock = jest.fn().mockReturnValue({ delete: deleteMock });
    const createQueryBuilderMock = jest.fn().mockReturnValue({
      init: initMock,
      where: whereMock,
    });

    const lifecycleRunMock = jest.fn().mockResolvedValue({});
    const deleteRelationsMock = jest.fn().mockResolvedValue(undefined);

    const db = {
      metadata: { get: jest.fn().mockReturnValue({ attributes: {} }) },
      lifecycles: { run: lifecycleRunMock },
      transaction: transactionMock,
    } as any;

    const strapi = { db: { transaction: transactionMock } } as any;
    (global as any).strapi = strapi;

    const em = createEntityManager(db);

    // Mock internal methods
    em.createQueryBuilder = createQueryBuilderMock;
    em.deleteRelations = deleteRelationsMock;

    // First call (init select) returns entity IDs
    executeMock
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }, { id: 3 }])
      // Second call (delete) returns count
      .mockResolvedValueOnce(3);

    const result = await em.deleteMany('api::article.article', {
      where: { publishedAt: null },
    });

    expect(result).toEqual({ count: 3 });

    // Verify IDs were fetched before deletion
    expect(initMock).toHaveBeenCalledWith({
      select: ['id'],
      where: { publishedAt: null },
    });

    // Verify relations were cleaned up for each entity
    expect(deleteRelationsMock).toHaveBeenCalledTimes(3);
    expect(deleteRelationsMock).toHaveBeenCalledWith('api::article.article', 1, {
      transaction: 'trx',
    });
    expect(deleteRelationsMock).toHaveBeenCalledWith('api::article.article', 2, {
      transaction: 'trx',
    });
    expect(deleteRelationsMock).toHaveBeenCalledWith('api::article.article', 3, {
      transaction: 'trx',
    });

    expect(commitMock).toHaveBeenCalled();
    expect(rollbackMock).not.toHaveBeenCalled();
  });

  test('skips relation cleanup when no entities match', async () => {
    const transactionMock = jest.fn();
    const executeMock = jest.fn();
    const initMock = jest.fn().mockReturnValue({ execute: executeMock });
    const deleteMock = jest.fn().mockReturnValue({ execute: executeMock });
    const whereMock = jest.fn().mockReturnValue({ delete: deleteMock });

    const db = {
      metadata: { get: jest.fn().mockReturnValue({ attributes: {} }) },
      lifecycles: { run: jest.fn().mockResolvedValue({}) },
      transaction: transactionMock,
    } as any;

    const em = createEntityManager(db);
    em.createQueryBuilder = jest.fn().mockReturnValue({ init: initMock, where: whereMock });
    em.deleteRelations = jest.fn();

    executeMock.mockResolvedValueOnce([]).mockResolvedValueOnce(0);

    const result = await em.deleteMany('api::article.article', {
      where: { id: 999 },
    });

    expect(result).toEqual({ count: 0 });
    expect(transactionMock).not.toHaveBeenCalled();
    expect(em.deleteRelations).not.toHaveBeenCalled();
  });
});
