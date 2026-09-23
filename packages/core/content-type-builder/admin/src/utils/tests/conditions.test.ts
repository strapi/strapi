import { checkDependentRows, formatCondition } from '../conditions';

import type { AttributeConditions, ContentTypes } from '../../types';

/**
 * Coverage for the conditional-fields helpers. The lint-cleanup branch rewrote their guards
 * (`if (fieldVar && ...)` -> `if (fieldVar...)`, `!condition?.visible` -> `=== undefined`) and
 * these helpers had no unit test. These cases lock the reachable, well-formed behaviour:
 * a `visible` rule is `{ [operator]: [{ var: fieldName }, value] }`.
 */

const makeContentType = (attributes: Record<string, unknown>, displayName = 'Article') =>
  ({
    info: { displayName },
    attributes,
  }) as unknown as ContentTypes[string];

describe('CTB | utils | conditions', () => {
  describe('checkDependentRows', () => {
    it('finds an attribute whose visibility condition references the given field', () => {
      const contentTypes: ContentTypes = {
        'api::article.article': makeContentType({
          isFeatured: { name: 'isFeatured', type: 'boolean' },
          subtitle: {
            name: 'subtitle',
            type: 'string',
            conditions: { visible: { '==': [{ var: 'isFeatured' }, true] } },
          },
        }),
      };

      expect(checkDependentRows(contentTypes, 'isFeatured')).toEqual([
        { contentTypeUid: 'api::article.article', contentType: 'Article', attribute: 'subtitle' },
      ]);
    });

    it('supports the array format of attributes', () => {
      const contentTypes: ContentTypes = {
        'api::article.article': makeContentType([
          { name: 'isFeatured', type: 'boolean' },
          {
            name: 'subtitle',
            type: 'string',
            conditions: { visible: { '==': [{ var: 'isFeatured' }, true] } },
          },
        ] as unknown as Record<string, unknown>),
      };

      expect(checkDependentRows(contentTypes, 'isFeatured')).toEqual([
        { contentTypeUid: 'api::article.article', contentType: 'Article', attribute: 'subtitle' },
      ]);
    });

    it('returns an empty array when no condition references the field', () => {
      const contentTypes: ContentTypes = {
        'api::article.article': makeContentType({
          subtitle: {
            name: 'subtitle',
            type: 'string',
            conditions: { visible: { '==': [{ var: 'isFeatured' }, true] } },
          },
        }),
      };

      expect(checkDependentRows(contentTypes, 'somethingElse')).toEqual([]);
    });

    it('ignores attributes that have no conditions', () => {
      const contentTypes: ContentTypes = {
        'api::article.article': makeContentType({
          title: { name: 'title', type: 'string' },
        }),
      };

      expect(checkDependentRows(contentTypes, 'title')).toEqual([]);
    });

    it('ignores attributes whose visible condition is null', () => {
      const contentTypes: ContentTypes = {
        'api::article.article': makeContentType({
          subtitle: {
            name: 'subtitle',
            type: 'string',
            conditions: { visible: null },
          },
        }),
      };

      expect(checkDependentRows(contentTypes, 'isFeatured')).toEqual([]);
    });

    it('ignores malformed condition rules', () => {
      const contentTypes: ContentTypes = {
        'api::article.article': makeContentType({
          subtitle: {
            name: 'subtitle',
            type: 'string',
            conditions: { visible: { '==': [] } },
          },
        }),
      };

      expect(checkDependentRows(contentTypes, 'isFeatured')).toEqual([]);
    });
  });

  describe('formatCondition', () => {
    const availableFields = [{ name: 'isFeatured', type: 'boolean' }];

    it('formats an equality condition as a "Show" rule', () => {
      const condition: AttributeConditions = { visible: { '==': [{ var: 'isFeatured' }, true] } };

      expect(formatCondition(condition, availableFields, 'subtitle')).toBe(
        'If isFeatured is true, then Show subtitle'
      );
    });

    it('formats a non-equality condition as a "Hide" rule', () => {
      const condition: AttributeConditions = { visible: { '!=': [{ var: 'isFeatured' }, false] } };

      expect(formatCondition(condition, availableFields, 'subtitle')).toBe(
        'If isFeatured is not false, then Hide subtitle'
      );
    });

    it('returns an empty string when there is no visible condition', () => {
      expect(formatCondition({}, availableFields, 'subtitle')).toBe('');
    });

    it('returns an empty string when the visible condition is an empty object', () => {
      expect(formatCondition({ visible: {} }, availableFields, 'subtitle')).toBe('');
    });

    it('returns an empty string when the visible condition is null', () => {
      const condition = { visible: null } as unknown as AttributeConditions;

      expect(formatCondition(condition, availableFields, 'subtitle')).toBe('');
    });

    it('returns an empty string when the condition rule is malformed', () => {
      const condition = { visible: { '==': [] } } as unknown as AttributeConditions;

      expect(formatCondition(condition, availableFields, 'subtitle')).toBe('');
    });
  });
});
