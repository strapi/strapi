import { ApplicationError, ValidationError } from '../errors';
import type { Model } from '../types';
import {
  buildPublicationFilterWhere,
  parsePublicationFilter,
  validatePublicationFilterQueryParam,
} from '../publication-filter';

const ALLOWED_VALUES = [
  'never-published',
  'has-published-version',
  'modified',
  'unmodified',
  'never-published-document',
  'has-published-version-document',
  'published-without-draft',
  'published-with-draft',
] as const;

describe('parsePublicationFilter', () => {
  it('returns undefined for undefined and null', () => {
    expect(parsePublicationFilter(undefined)).toBeUndefined();
    expect(parsePublicationFilter(null)).toBeUndefined();
  });

  it.each(ALLOWED_VALUES)('accepts valid value %s', (value) => {
    expect(parsePublicationFilter(value)).toBe(value);
  });

  it('rejects unknown strings', () => {
    expect(() => parsePublicationFilter('not-a-mode')).toThrow(ValidationError);
    expect(() => parsePublicationFilter('not-a-mode')).toThrow(
      /Invalid value for 'publicationFilter'/
    );
  });

  it('rejects non-string values', () => {
    expect(() => parsePublicationFilter(1)).toThrow(ValidationError);
    expect(() => parsePublicationFilter(true)).toThrow(ValidationError);
    expect(() => parsePublicationFilter({})).toThrow(ValidationError);
  });

  it('error message lists all allowed values', () => {
    try {
      parsePublicationFilter('invalid');
    } catch (e: any) {
      for (const v of ALLOWED_VALUES) {
        expect(e.message).toContain(v);
      }
    }
  });
});

describe('validatePublicationFilterQueryParam', () => {
  it('does nothing for undefined or null', () => {
    expect(() => validatePublicationFilterQueryParam(undefined)).not.toThrow();
    expect(() => validatePublicationFilterQueryParam(null)).not.toThrow();
  });

  it('throws ValidationError with query source and param for invalid values', () => {
    expect(() => validatePublicationFilterQueryParam('bad-value')).toThrow(ValidationError);
    try {
      validatePublicationFilterQueryParam('bad-value');
    } catch (e: any) {
      expect(e.details?.source).toBe('query');
      expect(e.details?.param).toBe('publicationFilter');
    }
  });
});

describe('buildPublicationFilterWhere', () => {
  const draftPublishModel = {
    modelType: 'contentType' as const,
    uid: 'api::article.article',
    attributes: {},
    options: { draftAndPublish: true },
  } as Model;

  /** Not used when columnName throws first; satisfies knex param type. */
  const knexStub = {} as any;

  it('throws ApplicationError when a required attribute is missing from metadata', () => {
    const meta = {
      tableName: 'articles',
      attributes: {
        id: { type: 'integer', columnName: 'id' },
      },
    };

    expect(() =>
      buildPublicationFilterWhere(knexStub, meta, draftPublishModel, 'never-published', 'draft')
    ).toThrow(ApplicationError);
    expect(() =>
      buildPublicationFilterWhere(knexStub, meta, draftPublishModel, 'never-published', 'draft')
    ).toThrow(/attribute 'documentId' is missing from metadata/);
  });

  it('throws ApplicationError when an attribute has no resolved columnName', () => {
    const meta = {
      tableName: 'articles',
      attributes: {
        id: { type: 'integer' },
        documentId: { type: 'string', columnName: 'document_id' },
        publishedAt: { type: 'datetime', columnName: 'published_at' },
        updatedAt: { type: 'datetime', columnName: 'updated_at' },
      },
    };

    expect(() =>
      buildPublicationFilterWhere(knexStub, meta, draftPublishModel, 'never-published', 'draft')
    ).toThrow(ApplicationError);
    expect(() =>
      buildPublicationFilterWhere(knexStub, meta, draftPublishModel, 'never-published', 'draft')
    ).toThrow(/attribute 'id' on table 'articles' has no resolved columnName/);
  });
});
