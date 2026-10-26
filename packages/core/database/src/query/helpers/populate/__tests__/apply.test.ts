import { transactionCtx } from '../../../../transaction-context';
import applyPopulate from '../apply';

const manyToOne = (target: string, joinColumnName: string) => ({
  type: 'relation',
  relation: 'manyToOne',
  target,
  joinColumn: { name: joinColumnName, referencedColumn: 'id' },
});

const targetMeta = (uid: string) => ({
  uid,
  attributes: { id: { type: 'integer' } },
  columnToAttribute: { id: 'id' },
});

const metas: Record<string, any> = {
  'api::post.post': {
    uid: 'api::post.post',
    attributes: {
      author: manyToOne('api::author.author', 'author_id'),
      category: manyToOne('api::category.category', 'category_id'),
      tag: manyToOne('api::tag.tag', 'tag_id'),
    },
  },
  'api::author.author': targetMeta('api::author.author'),
  'api::category.category': targetMeta('api::category.category'),
  'api::tag.tag': targetMeta('api::tag.tag'),
};

/**
 * A database double whose query builders record how many populate queries are in flight at
 * once. Every query takes a tick to resolve, so concurrent tasks overlap and sequential ones
 * do not.
 */
const createDb = () => {
  let inFlight = 0;
  let maxInFlight = 0;

  const createQueryBuilder = () => {
    const qb: any = {
      alias: 't0',
      init: () => qb,
      addSelect: () => qb,
      where: () => qb,
      async execute() {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);

        await new Promise((resolve) => {
          setTimeout(resolve, 5);
        });

        inFlight -= 1;

        return [{ id: 1 }];
      },
    };

    return qb;
  };

  const db: any = {
    metadata: { get: (uid: string) => metas[uid] },
    entityManager: { createQueryBuilder },
  };

  return { db, getMaxInFlight: () => maxInFlight };
};

const populate = { author: true, category: true, tag: true };

// applyPopulate fills the relations into the rows it is given, so the rows are the result.
const runPopulate = async (db: any) => {
  const results: Record<string, unknown>[] = [{ id: 1, author_id: 1, category_id: 1, tag_id: 1 }];
  const ctx: any = { db, uid: 'api::post.post', qb: { alias: 't0', state: {} } };

  await applyPopulate(results, populate, ctx);

  return results;
};

describe('applyPopulate', () => {
  test('fans the populate queries out in parallel outside a transaction', async () => {
    const { db, getMaxInFlight } = createDb();

    const results = await runPopulate(db);

    expect(getMaxInFlight()).toBe(3);
    expect(results[0]).toMatchObject({ author: { id: 1 }, category: { id: 1 }, tag: { id: 1 } });
  });

  test('runs the populate queries one at a time inside a transaction', async () => {
    const { db, getMaxInFlight } = createDb();

    const results = await transactionCtx.run({} as any, () => runPopulate(db));

    expect(getMaxInFlight()).toBe(1);
    expect(results[0]).toMatchObject({ author: { id: 1 }, category: { id: 1 }, tag: { id: 1 } });
  });
});
