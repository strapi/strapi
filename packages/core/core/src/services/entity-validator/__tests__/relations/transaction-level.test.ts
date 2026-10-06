import type { Schema } from '@strapi/types';

import entityValidator from '../..';

/**
 * The relation existence check runs one `count` query per relation target. Inside a transaction
 * every query is bound to the transaction's single connection, so the checks must run one after
 * another there, and keep fanning out over the pool outside one.
 */
describe('Entity validator | Relations | Transaction', () => {
  const manyToOne = (target: string) => ({ type: 'relation', relation: 'manyToOne', target });

  const model = {
    modelType: 'contentType',
    kind: 'collectionType',
    uid: 'api::post.post',
    modelName: 'post',
    globalId: 'Post',
    info: { displayName: 'Post', singularName: 'post', pluralName: 'posts' },
    options: {},
    attributes: {
      title: { type: 'string' },
      author: manyToOne('api::author.author'),
      category: manyToOne('api::category.category'),
      tag: manyToOne('api::tag.tag'),
    },
  } as Schema.ContentType;

  const data = { title: 'Hello', author: 1, category: 2, tag: 3 };

  /**
   * A strapi double whose `count` records how many relation checks are in flight at once. Every
   * query takes a tick to resolve, so concurrent checks overlap and sequential ones do not.
   */
  const setup = ({
    inTransaction,
    missing = [],
  }: {
    inTransaction: boolean;
    missing?: string[];
  }) => {
    let inFlight = 0;
    let maxInFlight = 0;

    const count = async ({ where }: any) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);

      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });

      inFlight -= 1;

      return where.id.$in.length;
    };

    global.strapi = {
      db: {
        query: (uid: string) => ({ count: missing.includes(uid) ? async () => 0 : count }),
        inTransaction: () => inTransaction,
      },
      errors: { badRequest: jest.fn() },
      getModel: () => model,
    } as any;

    return { getMaxInFlight: () => maxInFlight };
  };

  test('checks the relation targets in parallel outside a transaction', async () => {
    const { getMaxInFlight } = setup({ inTransaction: false });

    await expect(entityValidator.validateEntityCreation(model, data)).resolves.toMatchObject(data);
    expect(getMaxInFlight()).toBe(3);
  });

  test('checks the relation targets one at a time inside a transaction', async () => {
    const { getMaxInFlight } = setup({ inTransaction: true });

    await expect(entityValidator.validateEntityCreation(model, data)).resolves.toMatchObject(data);
    expect(getMaxInFlight()).toBe(1);
  });

  test('still reports a missing relation inside a transaction', async () => {
    setup({ inTransaction: true, missing: ['api::tag.tag'] });

    await expect(entityValidator.validateEntityCreation(model, data)).rejects.toMatchObject({
      name: 'ValidationError',
      message: '1 relation(s) of type api::tag.tag associated with this entity do not exist',
    });
  });
});
