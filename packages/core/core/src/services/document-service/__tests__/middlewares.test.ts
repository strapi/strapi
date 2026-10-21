import { errors as databaseErrors } from '@strapi/database';
import { errors } from '@strapi/utils';

import { createMiddlewareManager } from '../middlewares/middleware-manager';
import { databaseErrorsMiddleware } from '../middlewares/errors';

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

describe('databaseErrorsMiddleware', () => {
  test.each([
    ['InvalidBooleanError', databaseErrors.InvalidBooleanError],
    ['InvalidDateError', databaseErrors.InvalidDateError],
  ])('transforms %s into a ValidationError', async (_name, DatabaseErrorClass) => {
    const error = new DatabaseErrorClass();
    const next = jest.fn(() => Promise.reject(error));

    const result = databaseErrorsMiddleware({} as any, next);

    await expect(result).rejects.toBeInstanceOf(errors.ValidationError);
    await expect(result).rejects.toHaveProperty('message', error.message);
  });

  test('rethrows other errors unchanged', async () => {
    const error = new Error('boom');
    const next = jest.fn(() => Promise.reject(error));

    await expect(databaseErrorsMiddleware({} as any, next)).rejects.toBe(error);
  });
});
