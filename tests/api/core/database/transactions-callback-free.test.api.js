'use strict';

const { createStrapiInstance } = require('api-tests/strapi');

let strapi;

const createGate = () => {
  let release;
  const promise = new Promise((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

describe('callback-free transaction finalization', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test.each(['commit', 'rollback'])(
    'shares an in-flight %s across matching callback-free helpers',
    async (finalization) => {
      const handle = await strapi.db.transaction();
      const trx = handle.get();
      const gate = createGate();
      const original = trx[finalization].bind(trx);
      let finalizations = 0;

      trx[finalization] = async () => {
        finalizations += 1;
        await gate.promise;
        return original();
      };

      const first = handle[finalization]();
      const second = handle[finalization]();
      try {
        await Promise.resolve();
        expect(finalizations).toBe(1);
      } finally {
        gate.release();
        await Promise.allSettled([first, second]);
      }

      await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
      expect(finalizations).toBe(1);
    }
  );

  test.each(['commit', 'rollback'])(
    'rejects a competing callback-free helper while %s is in flight',
    async (finalization) => {
      const opposite = finalization === 'commit' ? 'rollback' : 'commit';
      const handle = await strapi.db.transaction();
      const trx = handle.get();
      const gate = createGate();
      const originalFinalization = trx[finalization].bind(trx);
      const originalOpposite = trx[opposite].bind(trx);
      let finalizations = 0;
      let competingFinalizations = 0;

      trx[finalization] = async () => {
        finalizations += 1;
        await gate.promise;
        return originalFinalization();
      };
      trx[opposite] = async () => {
        competingFinalizations += 1;
        return originalOpposite();
      };

      const first = handle[finalization]();
      const competing = handle[opposite]();
      try {
        await expect(competing).rejects.toThrow(
          'Transaction is finalizing; another finalizer is not allowed.'
        );
        expect(competingFinalizations).toBe(0);
      } finally {
        gate.release();
        await Promise.allSettled([first, competing]);
      }

      await expect(first).resolves.toBeUndefined();
      expect(finalizations).toBe(1);
      expect(competingFinalizations).toBe(0);
    }
  );
});
