import { routingCtx } from '../routing-context';

describe('routingCtx (request-scoped read/write routing)', () => {
  describe('outside a scope', () => {
    it('reports no scope', () => {
      expect(routingCtx.hasScope()).toBe(false);
    });

    it('is not dirty', () => {
      expect(routingCtx.isDirty()).toBe(false);
    });

    it('does not allow replica reads (safe default: writer)', () => {
      expect(routingCtx.shouldUseReplica()).toBe(false);
    });

    it('markDirty outside a scope is a no-op and does not throw', () => {
      expect(() => routingCtx.markDirty()).not.toThrow();
      expect(routingCtx.isDirty()).toBe(false);
    });
  });

  describe('inside a fresh scope', () => {
    it('reports a scope', async () => {
      await routingCtx.run(() => {
        expect(routingCtx.hasScope()).toBe(true);
      });
    });

    it('starts clean and allows replica reads', async () => {
      await routingCtx.run(() => {
        expect(routingCtx.isDirty()).toBe(false);
        expect(routingCtx.shouldUseReplica()).toBe(true);
      });
    });

    it('becomes dirty after markDirty and then routes reads to writer', async () => {
      await routingCtx.run(() => {
        expect(routingCtx.shouldUseReplica()).toBe(true);
        routingCtx.markDirty();
        expect(routingCtx.isDirty()).toBe(true);
        expect(routingCtx.shouldUseReplica()).toBe(false);
      });
    });

    it('returns the callback result', async () => {
      const result = await routingCtx.run(() => 'value');
      expect(result).toBe('value');
    });
  });

  describe('scope isolation', () => {
    it('a fresh scope resets to clean even after a previous scope was dirtied', async () => {
      await routingCtx.run(() => {
        routingCtx.markDirty();
        expect(routingCtx.isDirty()).toBe(true);
      });

      await routingCtx.run(() => {
        expect(routingCtx.isDirty()).toBe(false);
        expect(routingCtx.shouldUseReplica()).toBe(true);
      });
    });

    it('dirtiness does not leak back outside the scope', async () => {
      await routingCtx.run(() => {
        routingCtx.markDirty();
      });
      expect(routingCtx.isDirty()).toBe(false);
      expect(routingCtx.hasScope()).toBe(false);
    });

    it('nested run inherits the outer dirty state', async () => {
      await routingCtx.run(async () => {
        routingCtx.markDirty();
        await routingCtx.run(() => {
          // a nested scope must not "clean" an already-dirty ancestor,
          // otherwise a read-after-write could escape to the replica
          expect(routingCtx.isDirty()).toBe(true);
        });
      });
    });
  });
});
