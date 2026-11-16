import { describe, it, expect } from 'vitest';
import type { Core } from '@strapi/types';
import { createComponents, deleteComponents, updateComponents } from '../components';

const POST_UID = 'api::post.post';
const PAGE_UID = 'api::page.page';
const BLOCK_UID = 'default.block';

const models: Record<string, any> = {
  // A repeatable component field
  [POST_UID]: {
    uid: POST_UID,
    modelType: 'contentType',
    attributes: {
      blocks: { type: 'component', component: BLOCK_UID, repeatable: true },
    },
  },
  // A dynamic zone field
  [PAGE_UID]: {
    uid: PAGE_UID,
    modelType: 'contentType',
    attributes: {
      zone: { type: 'dynamiczone', components: [BLOCK_UID] },
    },
  },
  [BLOCK_UID]: {
    uid: BLOCK_UID,
    modelType: 'component',
    attributes: {
      text: { type: 'string' },
    },
  },
};

const storedBlocks = [
  { id: 1, text: 'a' },
  { id: 2, text: 'b' },
  { id: 3, text: 'c' },
];
const storedZone = storedBlocks.map((block) => ({ ...block, __component: BLOCK_UID }));

// New entries: no ids, so every one is created
const newBlocks = { blocks: [{ text: 'a' }, { text: 'b' }, { text: 'c' }] };
const newZone = {
  zone: newBlocks.blocks.map((block) => ({ ...block, __component: BLOCK_UID })),
};

// The stored entries with a changed scalar: every one is updated in place
const editedBlocks = {
  blocks: storedBlocks.map((block) => ({ ...block, text: `${block.text}!` })),
};
const editedZone = { zone: storedZone.map((entry) => ({ ...entry, text: `${entry.text}!` })) };

/**
 * Repeatable components and dynamic zone entries are written one query each. Inside a
 * transaction every query is bound to the transaction's single connection, so they must run
 * one after another there, and keep fanning out over the pool outside one.
 */
describe('Components | Transaction', () => {
  /**
   * A strapi double whose query engine records how many component queries are in flight at once,
   * and which kind. Every query takes a tick to resolve, so concurrent writes overlap and
   * sequential ones do not.
   */
  const setup = (inTransaction: boolean) => {
    let inFlight = 0;
    let maxInFlight = 0;
    let nextId = 100;
    const calls = { create: 0, update: 0, delete: 0 };

    const settle = async <T>(value: T): Promise<T> => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);

      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });

      inFlight -= 1;

      return value;
    };

    const query = (uid: string) => ({
      create({ data: entry }: any) {
        calls.create += 1;
        nextId += 1;

        return settle({ id: nextId, ...entry });
      },
      update({ where, data: entry }: any) {
        calls.update += 1;

        return settle({ id: where.id, ...entry });
      },
      delete() {
        calls.delete += 1;

        return settle(undefined);
      },
      // `load(entity, [attributes])` returns the entity's component fields; `load(entity, attribute)` one field
      load(_entity: unknown, attributes: string | string[]) {
        const field = uid === PAGE_UID ? { zone: storedZone } : { blocks: storedBlocks };

        return settle(Array.isArray(attributes) ? field : Object.values(field)[0]);
      },
    });

    global.strapi = {
      db: {
        query,
        inTransaction: () => inTransaction,
        // A component type with delete lifecycles is deleted row by row; that per-row path is the
        // one that fans out, so the delete cases exercise it rather than the batched `deleteMany`.
        lifecycles: { hasSubscribers: () => true },
      },
      getModel: (uid: string) => models[uid],
      components: { [BLOCK_UID]: models[BLOCK_UID] },
    } as unknown as Core.Strapi;

    return { getMaxInFlight: () => maxInFlight, calls };
  };

  describe.each([
    { where: 'outside a transaction', inTransaction: false, expected: 3 },
    { where: 'inside a transaction', inTransaction: true, expected: 1 },
  ])('$where', ({ inTransaction, expected }) => {
    it('creates repeatable components', async () => {
      const { getMaxInFlight, calls } = setup(inTransaction);

      const body = await createComponents(POST_UID, newBlocks);

      expect(getMaxInFlight()).toBe(expected);
      expect(calls).toEqual({ create: 3, update: 0, delete: 0 });
      expect(body.blocks).toHaveLength(3);
    });

    it('creates dynamic zone entries', async () => {
      const { getMaxInFlight, calls } = setup(inTransaction);

      const body = await createComponents(PAGE_UID, newZone as any);

      expect(getMaxInFlight()).toBe(expected);
      expect(calls).toEqual({ create: 3, update: 0, delete: 0 });
      expect(body.zone).toHaveLength(3);
    });

    it('updates repeatable components in place', async () => {
      const { getMaxInFlight, calls } = setup(inTransaction);

      const body = await updateComponents(POST_UID, { id: 1 }, editedBlocks);

      expect(getMaxInFlight()).toBe(expected);
      expect(calls).toEqual({ create: 0, update: 3, delete: 0 });
      expect(body.blocks).toHaveLength(3);
    });

    it('updates dynamic zone entries in place', async () => {
      const { getMaxInFlight, calls } = setup(inTransaction);

      const body = await updateComponents(PAGE_UID, { id: 1 }, editedZone as any);

      expect(getMaxInFlight()).toBe(expected);
      expect(calls).toEqual({ create: 0, update: 3, delete: 0 });
      expect(body.zone).toHaveLength(3);
    });

    it('replaces repeatable components sent without ids', async () => {
      const { getMaxInFlight, calls } = setup(inTransaction);

      const body = await updateComponents(POST_UID, { id: 1 }, newBlocks);

      expect(getMaxInFlight()).toBe(expected);
      expect(calls).toEqual({ create: 3, update: 0, delete: 3 });
      expect(body.blocks).toHaveLength(3);
    });

    it('replaces dynamic zone entries sent without ids', async () => {
      const { getMaxInFlight, calls } = setup(inTransaction);

      const body = await updateComponents(PAGE_UID, { id: 1 }, newZone as any);

      expect(getMaxInFlight()).toBe(expected);
      expect(calls).toEqual({ create: 3, update: 0, delete: 3 });
      expect(body.zone).toHaveLength(3);
    });

    it('deletes repeatable components', async () => {
      const { getMaxInFlight, calls } = setup(inTransaction);

      await deleteComponents(POST_UID, { id: 1 } as any);

      expect(getMaxInFlight()).toBe(expected);
      expect(calls).toEqual({ create: 0, update: 0, delete: 3 });
    });

    it('deletes dynamic zone entries', async () => {
      const { getMaxInFlight, calls } = setup(inTransaction);

      await deleteComponents(PAGE_UID, { id: 1 } as any);

      expect(getMaxInFlight()).toBe(expected);
      expect(calls).toEqual({ create: 0, update: 0, delete: 3 });
    });
  });
});
