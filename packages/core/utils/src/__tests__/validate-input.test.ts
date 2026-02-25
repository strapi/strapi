import * as z from 'zod/v4';
import { createAPIValidators } from '../validate';
import { ValidationError } from '../errors';
import { articleModel, getModel } from './test-fixtures';

describe('validateInput', () => {
  const validators = createAPIValidators({ getModel });
  const schema = articleModel;

  it('throws for unrecognized root-level key', async () => {
    const input = { title: 'x', extraKey: 'y' };

    await expect(validators.input(input, schema)).rejects.toThrow(ValidationError);
  });

  it('accepts only schema attributes at root', async () => {
    const input = { title: 'x' };

    await expect(validators.input(input, schema)).resolves.not.toThrow();
  });

  /**
   * When strictParams is true, only schema attributes and extra root keys from route.request.body are allowed.
   * Extra params are validated with Zod; invalid values throw ValidationError.
   */
  describe('route.request.body', () => {
    it('allows extra body param from route at root and Zod parses', async () => {
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
      const input = { title: 'x', clientMutationId: 'abc' };

      await expect(validators.input(input, schema, { route })).resolves.not.toThrow();
    });

    it('throws when extra param is present but Zod parse fails', async () => {
      const route = {
        request: {
          body: {
            'application/json': z.object({
              title: z.string(),
              clientMutationId: z.string(),
            }),
          },
        },
      };
      const input = { title: 'x', clientMutationId: 123 };

      await expect(validators.input(input, schema, { route })).rejects.toThrow(ValidationError);
    });

    it('extra root key not in route body schema still throws', async () => {
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

      await expect(validators.input(input, schema, { route })).rejects.toThrow(ValidationError);
    });

    it('allows extra body param that is a nested object (non-scalar)', async () => {
      const route = {
        request: {
          body: {
            'application/json': z.object({
              title: z.string(),
              metadata: z.object({ source: z.string(), version: z.number() }).optional(),
            }),
          },
        },
      };
      const input = { title: 'x', metadata: { source: 'web', version: 1 } };

      await expect(validators.input(input, schema, { route })).resolves.not.toThrow();
    });

    it('throws when extra body param object fails Zod parse', async () => {
      const route = {
        request: {
          body: {
            'application/json': z.object({
              title: z.string(),
              metadata: z.object({ source: z.string(), version: z.number() }),
            }),
          },
        },
      };
      const input = { title: 'x', metadata: { source: 'web', version: 'not-a-number' } };

      await expect(validators.input(input, schema, { route })).rejects.toThrow(ValidationError);
    });
  });
});
