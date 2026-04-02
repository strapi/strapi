import { ValidationError } from '../errors';
import {
  parseHasPublishedVersionQueryParam,
  hasPublishedVersionBooleanToPublicationFilterMode,
} from '../has-published-version-param';

describe('parseHasPublishedVersionQueryParam', () => {
  it('returns undefined for undefined and null', () => {
    expect(parseHasPublishedVersionQueryParam(undefined)).toBeUndefined();
    expect(parseHasPublishedVersionQueryParam(null)).toBeUndefined();
  });

  it('parses true and "true"', () => {
    expect(parseHasPublishedVersionQueryParam(true)).toBe(true);
    expect(parseHasPublishedVersionQueryParam('true')).toBe(true);
  });

  it('parses false and "false"', () => {
    expect(parseHasPublishedVersionQueryParam(false)).toBe(false);
    expect(parseHasPublishedVersionQueryParam('false')).toBe(false);
  });

  it('throws on other values', () => {
    expect(() => parseHasPublishedVersionQueryParam('yes')).toThrow(ValidationError);
    expect(() => parseHasPublishedVersionQueryParam(1)).toThrow(ValidationError);
  });
});

describe('hasPublishedVersionBooleanToPublicationFilterMode', () => {
  it('maps to document-scoped publicationFilter modes', () => {
    expect(hasPublishedVersionBooleanToPublicationFilterMode(true)).toBe(
      'has-published-version-document'
    );
    expect(hasPublishedVersionBooleanToPublicationFilterMode(false)).toBe(
      'never-published-document'
    );
  });
});
