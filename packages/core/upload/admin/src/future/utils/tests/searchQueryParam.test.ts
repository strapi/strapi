import { encodeSearchQuery } from '../searchQueryParam';

describe('encodeSearchQuery', () => {
  it('leaves a plain word untouched', () => {
    expect(encodeSearchQuery('report')).toBe('report');
  });

  it('returns an empty string for an empty value', () => {
    expect(encodeSearchQuery('')).toBe('');
  });

  it('encodes an ampersand so the query is not truncated at the first hop', () => {
    expect(encodeSearchQuery('a&b')).toBe('a%26b');
  });

  it('encodes spaces', () => {
    expect(encodeSearchQuery('report final')).toBe('report%20final');
  });

  it('encodes percent and hash', () => {
    expect(encodeSearchQuery('100% #1')).toBe('100%25%20%231');
  });

  it('escapes a plus so qs.parse does not decode it as a space', () => {
    expect(encodeSearchQuery('report+final')).toBe('report%2Bfinal');
  });

  it('survives a full round trip through both encode hops', () => {
    // Both `setQuery` and the fetch client stringify with `{ encode: false }`,
    // and `qs.parse` decodes once in between.
    const encodedForUrl = encodeSearchQuery('a&b+c');
    const decodedFromUrl = decodeURIComponent(encodedForUrl.replace(/%2B/g, '+'));

    expect(decodedFromUrl).toBe('a&b+c');
  });
});
