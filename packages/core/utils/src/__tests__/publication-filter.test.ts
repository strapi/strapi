import { ValidationError } from '../errors';
import { parsePublicationFilter, validatePublicationFilterQueryParam } from '../publication-filter';

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
    try {
      validatePublicationFilterQueryParam('bad-value');
      expect.fail('expected throw');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ValidationError);
      expect(e.details?.source).toBe('query');
      expect(e.details?.param).toBe('publicationFilter');
    }
  });
});
