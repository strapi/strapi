import { describe, it, expect } from 'vitest';

import { formatAttribute, isConfigurable, isRelation } from '../attributes';

describe('attributes utils', () => {
  describe('isConfigurable', () => {
    it('defaults to true when configurable is omitted', () => {
      expect(isConfigurable({ type: 'string' })).toBe(true);
    });

    it('returns false when configurable is false', () => {
      expect(isConfigurable({ type: 'string', configurable: false })).toBe(false);
    });
  });

  describe('isRelation', () => {
    it('detects relation attributes', () => {
      expect(
        isRelation({ type: 'relation', relation: 'oneToMany', target: 'api::article.article' })
      ).toBe(true);
      expect(isRelation({ type: 'string' })).toBe(false);
    });
  });

  describe('formatAttribute', () => {
    it('formats media attributes', () => {
      expect(
        formatAttribute({
          type: 'media',
          multiple: true,
          required: true,
          private: true,
          allowedTypes: ['images'],
          pluginOptions: { i18n: { localized: true } },
        })
      ).toEqual({
        type: 'media',
        multiple: true,
        required: true,
        configurable: undefined,
        private: true,
        allowedTypes: ['images'],
        pluginOptions: { i18n: { localized: true } },
      });
    });

    it('formats relation attributes with targetAttribute from inversedBy', () => {
      expect(
        formatAttribute({
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::article.article',
          inversedBy: 'author',
          private: false,
          configurable: false,
        })
      ).toMatchObject({
        type: 'relation',
        target: 'api::article.article',
        targetAttribute: 'author',
        configurable: false,
        private: false,
      });
    });

    it('returns other attribute types unchanged', () => {
      const attribute = { type: 'string', minLength: 3 };
      expect(formatAttribute(attribute as any)).toBe(attribute);
    });
  });
});
