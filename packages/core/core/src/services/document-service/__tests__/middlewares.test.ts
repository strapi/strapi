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
});
