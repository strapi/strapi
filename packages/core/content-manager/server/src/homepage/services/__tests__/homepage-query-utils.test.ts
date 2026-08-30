import type { Schema } from '@strapi/types';

import {
  buildHomepageQueryFields,
  compactSanitizedFields,
  FALLBACK_MAIN_FIELD,
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
  describe('compactSanitizedFields', () => {
    it('drops undefined and non-string entries left after admin field sanitization', () => {
      expect(compactSanitizedFields(['documentId', 'updatedAt', undefined, 'title'])).toEqual([
        'documentId',
        'updatedAt',
        'title',
      ]);
    });

    it('returns undefined when fields is not a string array', () => {
      expect(compactSanitizedFields(undefined)).toBeUndefined();
      expect(compactSanitizedFields('title')).toBeUndefined();
    });
  });

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
});
