import * as z from 'zod';
import {
  maxGreaterThanMin,
  maxLengthGreaterThanMinLength,
  validateUpdateSchema,
  verifyDraftAndPublishReservedAttributes,
} from '../schema';

describe('Schema', () => {
  let ctx: z.RefinementCtx & { addIssue: jest.Mock };
  let expectAddIssue: (shouldAddIssue: boolean) => void;

  beforeEach(() => {
    ctx = {
      addIssue: jest.fn(),
    } as unknown as z.RefinementCtx & { addIssue: jest.Mock };

    expectAddIssue = (shouldAddIssue: boolean) => {
      if (shouldAddIssue) {
        expect(ctx.addIssue).toHaveBeenCalled();
      } else {
        expect(ctx.addIssue).not.toHaveBeenCalled();
      }

      // so it can be ran many time inside the same test
      ctx.addIssue.mockClear();
    };
  });

  describe('validateUpdateSchema', () => {
    const schemaWithOptionalDefaults = (includeUndefined: boolean) => ({
      data: {
        components: [
          {
            action: 'create',
            uid: 'shared.hero',
            displayName: 'Hero',
            category: 'shared',
            attributes: [],
            ...(includeUndefined ? { config: undefined } : {}),
          },
        ],
        contentTypes: [
          {
            action: 'create',
            uid: 'api::article.article',
            displayName: 'Article',
            draftAndPublish: true,
            singularName: 'article',
            pluralName: 'articles',
            kind: 'singleType',
            attributes: [],
            ...(includeUndefined ? { options: undefined, pluginOptions: undefined } : {}),
          },
        ],
      },
    });

    test('reports a missing schema', () => {
      expect(() => validateUpdateSchema(undefined)).toThrow('Schema is required');
    });

    test('reports a schema with the wrong type', () => {
      expect(() => validateUpdateSchema('invalid')).toThrow(
        'Invalid schema, expected an object with a data property'
      );
    });

    test('applies collection defaults when keys are absent or undefined', () => {
      expect(validateUpdateSchema({ data: {} })).toEqual({
        data: { components: [], contentTypes: [] },
      });
      expect(
        validateUpdateSchema({ data: { components: undefined, contentTypes: undefined } })
      ).toEqual({
        data: { components: [], contentTypes: [] },
      });
    });

    test.each([
      ['absent', false],
      ['present with undefined', true],
    ])('applies nested object defaults when keys are %s', (_label, includeUndefined) => {
      expect(validateUpdateSchema(schemaWithOptionalDefaults(includeUndefined))).toMatchObject({
        data: {
          components: [{ config: {} }],
          contentTypes: [{ options: {}, pluginOptions: {} }],
        },
      });
    });
  });

  describe('maxLengthGreaterThanMinLength', () => {
    let expectError: (value: Record<string, unknown>, shouldError: boolean) => void;

    beforeEach(() => {
      expectError = (value: Record<string, unknown>, shouldError: boolean) => {
        maxLengthGreaterThanMinLength(value, ctx);
        expectAddIssue(shouldError);
      };
    });

    test('should not add error if maxLength is strictly greater than min', () => {
      expectError({ minLength: 1, maxLength: 2 }, false);
      expectError({ minLength: 0, maxLength: 1 }, false);
      expectError({ minLength: -1, maxLength: 0 }, false);
    });

    test('should not add error if maxLength is equals to minLength', () => {
      expectError({ minLength: 1, maxLength: 1 }, false);
      expectError({ minLength: 0, maxLength: 0 }, false);
      expectError({ minLength: -1, maxLength: -1 }, false);
    });

    test('should add error if maxLength is strictly less than minLength', () => {
      expectError({ minLength: 2, maxLength: 1 }, true);
      expectError({ minLength: 1, maxLength: 0 }, true);
      expectError({ minLength: 0, maxLength: -1 }, true);
    });
  });

  describe('maxGreaterThanMin', () => {
    let expectError: (value: Record<string, unknown>, shouldError: boolean) => void;

    beforeEach(() => {
      expectError = (value: Record<string, unknown>, shouldError: boolean) => {
        maxGreaterThanMin(value, ctx);
        expectAddIssue(shouldError);
      };
    });

    test('should not add error if max is strictly greater than min', () => {
      expectError({ min: 1, max: 2 }, false);
      expectError({ min: 0, max: 1 }, false);
      expectError({ min: -1, max: 0 }, false);
    });

    test('should not add error if max is equals to min', () => {
      expectError({ min: 1, max: 1 }, false);
      expectError({ min: 0, max: 0 }, false);
      expectError({ min: -1, max: -1 }, false);
    });

    test('should add error if max is strictly less than min', () => {
      expectError({ min: 2, max: 1 }, true);
      expectError({ min: 1, max: 0 }, true);
      expectError({ min: 0, max: -1 }, true);
    });

    test('should not add error if either max or min are not numbers', () => {
      // missing
      expectError({ max: 1 }, false);
      expectError({ min: 1 }, false);

      // undefined
      expectError({ max: 1, min: undefined }, false);
      expectError({ max: undefined, min: 1 }, false);

      // not a number
      expectError({ max: 1, min: 'hello' }, false);
      expectError({ max: 'hello', min: 1 }, false);
    });
  });

  describe('verifyDraftAndPublishReservedAttributes', () => {
    let expectError: (
      value: Parameters<typeof verifyDraftAndPublishReservedAttributes>[0],
      shouldError: boolean
    ) => void;

    beforeEach(() => {
      global.strapi = {
        contentTypes: {
          'api::reservation.reservation': {
            attributes: {
              title: { type: 'string' },
              status: { type: 'enumeration', enum: ['confirmed', 'canceled'] },
            },
          },
        },
      } as any;

      expectError = (value, shouldError) => {
        verifyDraftAndPublishReservedAttributes(value, ctx);
        expectAddIssue(shouldError);
      };
    });

    test('blocks enabling draft and publish when a status attribute exists', () => {
      expectError(
        {
          action: 'update',
          uid: 'api::reservation.reservation',
          draftAndPublish: true,
          attributes: [
            {
              action: 'update',
              name: 'status',
            },
          ],
        },
        true
      );
    });

    test('allows enabling draft and publish when status is removed in the same update', () => {
      expectError(
        {
          action: 'update',
          uid: 'api::reservation.reservation',
          draftAndPublish: true,
          attributes: [{ action: 'delete', name: 'status' }],
        },
        false
      );
    });

    test('allows draft and publish when no reserved attributes are present', () => {
      expectError(
        {
          action: 'create',
          draftAndPublish: true,
          attributes: [{ action: 'create', name: 'title' }],
        },
        false
      );
    });
  });
});
