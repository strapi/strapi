import { createEntityManager } from '../index';
import { createQueryBuilder } from '../../query';
import { transactionCtx } from '../../transaction-context';

jest.mock('../../query', () => ({
  createQueryBuilder: jest.fn(),
}));

const deadlock = () => Object.assign(new Error('deadlock detected'), { code: '40P01' });

const metadata = {
  get(uid: string) {
    if (uid === 'api::owner.owner') {
      return {
        attributes: {
          item: {
            type: 'relation',
            relation: 'morphToOne',
            morphColumn: {
              idColumn: { name: 'item_id' },
              typeColumn: { name: 'item_type' },
            },
          },
        },
      };
    }

    return {
      attributes: {
        title: { type: 'string' },
        owner: {
          type: 'relation',
          relation: 'morphOne',
          target: 'api::owner.owner',
          morphBy: 'item',
        },
      },
    };
  },
};

describe('entity-manager deadlock ownership', () => {
  const deletes: unknown[] = [];
  const updates: unknown[] = [];

  const builder = () => {
    const self: Record<string, jest.Mock> = {};
    let transacting = false;
    let first = false;

    for (const name of ['select', 'where', 'init', 'insert']) {
      self[name] = jest.fn(() => self);
    }

    self.first = jest.fn(() => {
      first = true;
      return self;
    });
    self.update = jest.fn((data) => {
      updates.push(data);
      return self;
    });
    self.delete = jest.fn(() => {
      deletes.push(true);
      return self;
    });
    self.transacting = jest.fn(() => {
      transacting = true;
      return self;
    });
    self.execute = jest.fn(async () => {
      if (transacting) {
        throw deadlock();
      }

      if (first) {
        return { id: 1, title: 'old' };
      }

      return [{ id: 1 }];
    });

    return self;
  };

  const db = {
    metadata,
    dialect: { usesForeignKeys: () => false },
    lifecycles: { run: jest.fn(async () => undefined) },
  } as any;

  beforeEach(() => {
    deletes.length = 0;
    updates.length = 0;
    (global as any).strapi = {
      db: {
        transaction: jest.fn(async () => ({
          get: () => ({}),
          commit: jest.fn(),
          rollback: jest.fn(),
        })),
      },
    };
    (createQueryBuilder as jest.Mock).mockImplementation(() => builder());
  });

  test('a nested create deadlock does not delete the inserted row', async () => {
    const em = createEntityManager(db);

    await expect(
      transactionCtx.run({} as any, () =>
        em.create('api::article.article', { data: { title: 'a', owner: 5 } })
      )
    ).rejects.toMatchObject({ code: '40P01' });

    expect(deletes).toHaveLength(0);
  });

  test('a top-level create deadlock deletes the inserted row', async () => {
    const em = createEntityManager(db);

    await expect(
      em.create('api::article.article', { data: { title: 'a', owner: 5 } })
    ).rejects.toMatchObject({ code: '40P01' });

    expect(deletes).toHaveLength(1);
  });

  test('a nested update deadlock does not restore the previous row', async () => {
    const em = createEntityManager(db);

    await expect(
      transactionCtx.run({} as any, () =>
        em.update('api::article.article', {
          where: { id: 1 },
          data: { title: 'next', owner: 5 },
        })
      )
    ).rejects.toMatchObject({ code: '40P01' });

    expect(updates).not.toContainEqual({ id: 1, title: 'old' });
  });

  test('a top-level update deadlock retries and then restores the previous row', async () => {
    const em = createEntityManager(db);

    await expect(
      em.update('api::article.article', {
        where: { id: 1 },
        data: { title: 'next', owner: 5 },
      })
    ).rejects.toMatchObject({ code: '40P01' });

    expect((global as any).strapi.db.transaction).toHaveBeenCalledTimes(3);
    expect(updates).toContainEqual({ id: 1, title: 'old' });
  });
});
