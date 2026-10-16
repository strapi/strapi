import type { Core } from '@strapi/types';
import { createComponents, deleteComponents, updateComponents } from '../components';

const POST_UID = 'api::post.post';
const BLOCK_UID = 'default.block';

const models: Record<string, any> = {
  [POST_UID]: {
    uid: POST_UID,
    attributes: {
      blocks: { type: 'component', component: BLOCK_UID, repeatable: true },
    },
  },
  [BLOCK_UID]: {
    uid: BLOCK_UID,
    attributes: {
      text: { type: 'string' },
    },
  },
};

const data = { blocks: [{ text: 'a' }, { text: 'b' }, { text: 'c' }] };

/**
 * Repeatable components and dynamic zone entries are written one query each. Inside a
 * transaction every query is bound to the transaction's single connection, so they must run
 * one after another there, and keep fanning out over the pool outside one.
 */
describe('Components | Transaction', () => {
  /**
   * A strapi double whose query engine records how many component queries are in flight at once.
   * Every query takes a tick to resolve, so concurrent writes overlap and sequential ones do not.
   */
  const setup = (inTransaction: boolean) => {
    let inFlight = 0;
    let maxInFlight = 0;
    let nextId = 0;

    const settle = async <T>(value: T): Promise<T> => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);

      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });

      inFlight -= 1;

      return value;
    };

    const query = () => ({
      create: ({ data: entry }: any) => settle({ id: (nextId += 1), ...entry }),
      update: ({ where, data: entry }: any) => settle({ id: where.id, ...entry }),
      delete: () => settle(undefined),
      load: () => settle([{ id: 1 }, { id: 2 }, { id: 3 }]),
    });

    global.strapi = {
      db: { query, inTransaction: () => inTransaction },
      getModel: (uid: string) => models[uid],
    } as unknown as Core.Strapi;

    return { getMaxInFlight: () => maxInFlight };
  };

  describe('outside a transaction', () => {
    it('creates repeatable components in parallel', async () => {
      const { getMaxInFlight } = setup(false);

      const body = await createComponents(POST_UID, data);

      expect(getMaxInFlight()).toBe(3);
      expect(body.blocks).toHaveLength(3);
    });

    it('updates repeatable components in parallel', async () => {
      const { getMaxInFlight } = setup(false);

      const body = await updateComponents(POST_UID, { id: 1 }, data);

      expect(getMaxInFlight()).toBe(3);
      expect(body.blocks).toHaveLength(3);
    });

    it('deletes repeatable components in parallel', async () => {
      const { getMaxInFlight } = setup(false);

      await deleteComponents(POST_UID, { id: 1 } as any);

      expect(getMaxInFlight()).toBe(3);
    });
  });

  describe('inside a transaction', () => {
    it('creates repeatable components one at a time', async () => {
      const { getMaxInFlight } = setup(true);

      const body = await createComponents(POST_UID, data);

      expect(getMaxInFlight()).toBe(1);
      expect(body.blocks).toHaveLength(3);
    });

    it('updates repeatable components one at a time', async () => {
      const { getMaxInFlight } = setup(true);

      const body = await updateComponents(POST_UID, { id: 1 }, data);

      expect(getMaxInFlight()).toBe(1);
      expect(body.blocks).toHaveLength(3);
    });

    it('deletes repeatable components one at a time', async () => {
      const { getMaxInFlight } = setup(true);

      await deleteComponents(POST_UID, { id: 1 } as any);

      expect(getMaxInFlight()).toBe(1);
    });
  });
});
