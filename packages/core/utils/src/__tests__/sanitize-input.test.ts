import * as z from 'zod/v4';
import { createAPISanitizers } from '../sanitize';
import { articleModel, getModel } from './test-fixtures';

describe('sanitizeInput', () => {
  const sanitizers = createAPISanitizers({ getModel });

  /**
   * When strictParams is true, only schema attributes and extra root keys from route.request.body are allowed.
   * Extra params are sanitized via Zod safeParse; invalid values are removed.
   */
  describe('strictParams with route.request.body', () => {
    it('keeps extra input param from route when strictParams: true and Zod parses', async () => {
      const route = {
        request: {
          body: {
            'application/json': z.object({
              title: z.string(),
              clientMutationId: z.string().transform((s) => s.trim()),
            }),
          },
        },
      };
      const input = { title: 'x', clientMutationId: '  foo  ' };

      const result = await sanitizers.input(input, articleModel, {
        strictParams: true,
        route,
      });

      expect(result).toHaveProperty('title', 'x');
      expect(result).toHaveProperty('clientMutationId', 'foo');
    });

    it('removes extra input param when Zod safeParse fails', async () => {
      const route = {
        request: {
          body: {
            'application/json': z.object({
              title: z.string(),
              clientMutationId: z.string().min(1),
            }),
          },
        },
      };
      const input = { title: 'x', clientMutationId: '' };

      const result = await sanitizers.input(input, articleModel, {
        strictParams: true,
        route,
      });

      expect(result).toHaveProperty('title', 'x');
      expect(result).not.toHaveProperty('clientMutationId');
    });

    it('strips root key not in route body schema when strictParams: true', async () => {
      const route = {
        request: {
          body: {
            'application/json': z.object({
              title: z.string(),
              clientMutationId: z.string().optional(),
            }),
          },
        },
      };
      const input = { title: 'x', otherExtraKey: 'y' };

      const result = await sanitizers.input(input, articleModel, {
        strictParams: true,
        route,
      });

      expect(result).toHaveProperty('title', 'x');
      expect(result).not.toHaveProperty('otherExtraKey');
    });

    it('sanitizes extra input param that is a nested object (non-scalar)', async () => {
      const route = {
        request: {
          body: {
            'application/json': z.object({
              title: z.string(),
              metadata: z
                .object({
                  source: z.string(),
                  version: z.number(),
                })
                .transform((m) => ({ ...m, source: m.source.trim() })),
            }),
          },
        },
      };
      const input = { title: 'x', metadata: { source: '  web  ', version: 1 } };

      const result = await sanitizers.input(input, articleModel, {
        strictParams: true,
        route,
      });

      expect(result).toHaveProperty('title', 'x');
      expect(result).toHaveProperty('metadata', { source: 'web', version: 1 });
    });
  });
});
