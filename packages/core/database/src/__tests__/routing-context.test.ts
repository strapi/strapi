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

  describe('withWriterOnly', () => {
    it('forces reads to the writer within the callback', async () => {
      await routingCtx.run(async () => {
        expect(routingCtx.shouldUseReplica()).toBe(true);
        await routingCtx.withWriterOnly(() => {
          expect(routingCtx.isWriterOnly()).toBe(true);
          expect(routingCtx.shouldUseReplica()).toBe(false);
        });
        // restored after the callback
        expect(routingCtx.isWriterOnly()).toBe(false);
        expect(routingCtx.shouldUseReplica()).toBe(true);
      });
    });

    it('returns the callback result', async () => {
      await routingCtx.run(async () => {
        const result = await routingCtx.withWriterOnly(() => 'value');
        expect(result).toBe('value');
      });
    });

    it('is inert (still runs the callback) when there is no scope', async () => {
      expect(routingCtx.isWriterOnly()).toBe(false);
      const result = await routingCtx.withWriterOnly(() => 'ok');
      expect(result).toBe('ok');
      expect(routingCtx.isWriterOnly()).toBe(false);
    });

    it('restores the previous writer-only state even if the callback throws', async () => {
      await routingCtx.run(async () => {
        await expect(
          routingCtx.withWriterOnly(() => {
            throw new Error('boom');
          })
        ).rejects.toThrow('boom');
        expect(routingCtx.isWriterOnly()).toBe(false);
      });
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
