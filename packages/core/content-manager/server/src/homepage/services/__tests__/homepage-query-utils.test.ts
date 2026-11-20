import type { Schema } from '@strapi/types';

import {
  buildHomepageQueryFields,
  FALLBACK_MAIN_FIELD,
  formatRecentDocumentTitle,
  resolveReadableMainField,
  resolveTitleField,
  type HomepagePermissionChecker,
} from '../homepage-query-utils';

const localizedArticleContentType = {
  uid: 'api::article.article',
  options: { draftAndPublish: true },
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    title: { type: 'string' },
    price: { type: 'integer' },
  },
} as unknown as Schema.ContentType;

const simpleContentType = {
  uid: 'api::page.page',
  options: { draftAndPublish: false },
  attributes: {
    slug: { type: 'string' },
  },
} as unknown as Schema.ContentType;

const createPermissionChecker = (unreadableFields: string[] = []): HomepagePermissionChecker => ({
  cannot: {
    read: (_entity, field) => unreadableFields.includes(field),
  },
});

describe('Homepage query utils', () => {
  describe('resolveReadableMainField', () => {
    const configuration = { settings: { mainField: 'title' } };

    it('falls back to documentId when the role cannot read the configured main field', () => {
      expect(
        resolveReadableMainField(
          localizedArticleContentType,
          configuration,
          createPermissionChecker(['title'])
        )
      ).toBe(FALLBACK_MAIN_FIELD);
    });

    it('keeps the configured main field when the role can read it', () => {
      expect(
        resolveReadableMainField(
          localizedArticleContentType,
          configuration,
          createPermissionChecker()
        )
      ).toBe('title');
    });

    it('uses the schema default main field when configuration is missing', () => {
      expect(
        resolveReadableMainField(localizedArticleContentType, undefined, createPermissionChecker())
      ).toBe('title');
    });
  });

  describe('buildHomepageQueryFields', () => {
    it('requests base, status, and locale fields without duplicating documentId as main field', () => {
      expect(buildHomepageQueryFields(localizedArticleContentType, FALLBACK_MAIN_FIELD)).toEqual([
        'documentId',
        'updatedAt',
        'publishedAt',
        'locale',
      ]);
    });

    it('includes the readable main field for draft & publish localized content types', () => {
      expect(buildHomepageQueryFields(localizedArticleContentType, 'title')).toEqual([
        'documentId',
        'updatedAt',
        'publishedAt',
        'title',
        'locale',
      ]);
    });

    it('requests only documentId, updatedAt, and main field for simple content types', () => {
      expect(buildHomepageQueryFields(simpleContentType, 'slug')).toEqual([
        'documentId',
        'updatedAt',
        'slug',
      ]);
    });
  });

  describe('resolveTitleField', () => {
    it('falls back to documentId when sanitization removed the main field', () => {
      expect(resolveTitleField('title', ['documentId', 'updatedAt'])).toBe(FALLBACK_MAIN_FIELD);
    });

    it('keeps the main field when it is still present after sanitization', () => {
      expect(resolveTitleField('title', ['documentId', 'title'])).toBe('title');
    });
  });

  describe('formatRecentDocumentTitle', () => {
    it.each([
      ['a string', 'Article 1', 'Article 1'],
      ['an integer', 42, '42'],
      ['zero', 0, '0'],
      ['a decimal', 9.5, '9.5'],
      ['a bigint', BigInt('9007199254740993'), '9007199254740993'],
      ['false', false, 'false'],
      ['true', true, 'true'],
      ['a date string', '2026-11-09', '2026-11-09'],
      ['a Date', new Date('2026-11-09T10:30:00.000Z'), '2026-11-09T10:30:00.000Z'],
    ])('returns %s as a string', (_label, value, expected) => {
      expect(formatRecentDocumentTitle(value)).toBe(expected);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['an empty string', ''],
      // No main field type returns an object, so it has no text form to show
      ['a plain object', { id: 1, name: 'Related' }],
      ['an array', ['a', 'b']],
    ])('returns an empty string for %s', (_label, value) => {
      // The widgets render an empty title as a translated "Untitled"
      expect(formatRecentDocumentTitle(value)).toBe('');
    });
  });
});
