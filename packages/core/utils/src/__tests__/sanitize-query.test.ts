import * as z from 'zod/v4';
import { createAPISanitizers } from '../sanitize';
import { articleModel, getModel } from './test-fixtures';

describe('sanitizeQuery', () => {
  const sanitizers = createAPISanitizers({ getModel });
  const schema = articleModel;

  /**
   * When strictParams is true, only allowed query keys (and extra keys from route.request.query) are kept.
   * Extra params are sanitized via Zod safeParse; invalid values are omitted.
   */
  describe('strictParams option', () => {
    it('strips unrecognized keys when strictParams: true', async () => {
      const query = { filters: { id: 1 }, where: { id: 1 } };
      const result = await sanitizers.query(query, schema, { strictParams: true });
      expect(result).not.toHaveProperty('where');
      expect(result).toHaveProperty('filters');
    });

    it('keeps unrecognized keys when strictParams: false', async () => {
      const query = { filters: { id: 1 }, where: { id: 1 } };
      const result = await sanitizers.query(query, schema, { strictParams: false });
      expect(result).toHaveProperty('where');
    });

    it('keeps extra param from route when strictParams: true and Zod parses successfully', async () => {
      const route = {
        request: {
          query: { search: z.string().transform((s) => s.trim()) },
        },
      };
      const query = { filters: { id: 1 }, search: '  foo  ' };
      const result = await sanitizers.query(query, schema, {
        strictParams: true,
        route,
      });
      expect(result).toHaveProperty('search', 'foo');
      expect(result).toHaveProperty('filters');
    });

    it('omits extra param from result when Zod safeParse fails (invalid value)', async () => {
      const route = {
        request: {
          query: { search: z.string().min(1) },
        },
      };
      const query = { filters: { id: 1 }, search: '' };
      const result = await sanitizers.query(query, schema, {
        strictParams: true,
        route,
      });
      expect(result).not.toHaveProperty('search');
      expect(result).toHaveProperty('filters');
    });

    it('sanitizes extra query param that is array of scalars (e.g. tags)', async () => {
      const route = {
        request: {
          query: { tags: z.array(z.string()).transform((arr) => arr.map((s) => s.trim())) },
        },
      };
      const query = { filters: { id: 1 }, tags: ['  a  ', '  b  '] };
      const result = await sanitizers.query(query, schema, {
        strictParams: true,
        route,
      });
      expect(result).toHaveProperty('tags', ['a', 'b']);
    });
  });
});
