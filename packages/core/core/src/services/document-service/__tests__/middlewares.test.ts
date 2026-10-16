import { createMiddlewareManager } from '../middlewares/middleware-manager';

describe('middlewares', () => {
  describe('wrapObject', () => {
    const manager = createMiddlewareManager();

    it('should wrap object', async () => {
      const obj = {
        async test() {
          return 'test';
        },
      };

      const wrapped = manager.wrapObject(obj);

      expect(await wrapped.test()).toBe('test');
    });

    it('should wrap object with context', async () => {
      const manager = createMiddlewareManager();
      const overwrittenId = 'overwrittenId';
      const middlewareFn = jest.fn(async (ctx: any, next: any) => {
        ctx.params.id = overwrittenId;
        return next();
      });

      manager.use(middlewareFn);

      const obj = {
        test({ id }: { id: number }) {
          return id;
        },
      };

      const wrapped = manager.wrapObject(obj, {
        defaultLocale: 'en',
      });

      expect(await wrapped.test({ id: 1 })).toBe(overwrittenId);
      expect(middlewareFn).toHaveBeenCalled();
    });
  });

  describe('use', () => {
    const createRecorder = () => {
      const calls: string[] = [];
      const record = (name: string) => async (_ctx: any, next: () => Promise<void>) => {
        calls.push(name);
        return next();
      };

      return { calls, record };
    };

    it('removes only its own middleware', async () => {
      const manager = createMiddlewareManager();
      const { calls, record } = createRecorder();

      manager.use(record('first'));
      const removeSecond = manager.use(record('second'));
      manager.use(record('third'));

      removeSecond();
      await manager.run({}, () => {});

      expect(calls).toEqual(['first', 'third']);
    });

    it('does nothing when the remover is called again', async () => {
      const manager = createMiddlewareManager();
      const { calls, record } = createRecorder();

      const removeFirst = manager.use(record('first'));
      manager.use(record('second'));
      manager.use(record('third'));

      removeFirst();
      removeFirst();
      await manager.run({}, () => {});

      expect(calls).toEqual(['second', 'third']);
    });
  });
});
