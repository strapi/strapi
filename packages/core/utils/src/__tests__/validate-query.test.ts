import * as z from 'zod/v4';
import { createAPIValidators } from '../validate';
import { ValidationError } from '../errors';
import { articleModel, getModel } from './test-fixtures';

describe('validateQuery', () => {
  const validators = createAPIValidators({ getModel });
  const schema = articleModel;

  /**
   * When strictParams is true, only allowed query keys (and extra keys from route.request.query) are accepted.
   * Extra params are validated with Zod; invalid values throw ValidationError.
   */
  describe('strictParams option', () => {
    it('throws when strictParams: true and query has unrecognized top-level key', async () => {
      const query = { filters: { id: 1 }, where: { id: 1 } };

      await expect(validators.query(query, schema, { strictParams: true })).rejects.toThrow(
        ValidationError
      );
    });

    it('does not throw for unrecognized top-level key when strictParams: false', async () => {
      const query = { filters: { id: 1 }, where: { id: 1 } };

      await expect(validators.query(query, schema, { strictParams: false })).resolves.not.toThrow();
    });

    it('does not throw when strictParams: true and query has only allowed keys', async () => {
      const query = { filters: { id: 1 }, sort: ['title'], page: 1, pageSize: 10 };

      await expect(validators.query(query, schema, { strictParams: true })).resolves.not.toThrow();
    });

    it('allows extra query param from route when strictParams: true and Zod parses', async () => {
      const route = { request: { query: { search: z.string() } } };
      const query = { filters: { id: 1 }, search: 'foo' };
      await expect(
        validators.query(query, schema, { strictParams: true, route })
      ).resolves.not.toThrow();
    });

    it('throws when strictParams: true, extra param present but Zod parse fails', async () => {
      const route = { request: { query: { search: z.string() } } };
      const query = { filters: { id: 1 }, search: 123 };
      await expect(validators.query(query, schema, { strictParams: true, route })).rejects.toThrow(
        ValidationError
      );
    });

    it('validates extra query param that is array of scalars (e.g. tags)', async () => {
      const route = { request: { query: { tags: z.array(z.string()) } } };
      const query = { filters: { id: 1 }, tags: ['a', 'b'] };
      await expect(
        validators.query(query, schema, { strictParams: true, route })
      ).resolves.not.toThrow();
    });

    it('throws when extra query param is array of scalars but value is invalid', async () => {
      const route = { request: { query: { tags: z.array(z.string()) } } };
      const query = { filters: { id: 1 }, tags: 'not-an-array' };
      await expect(validators.query(query, schema, { strictParams: true, route })).rejects.toThrow(
        ValidationError
      );
    });
  });
});
