import { localeForOriginalLookup } from '../original-locale';

describe('localeForOriginalLookup', () => {
  it('keeps a concrete locale', () => {
    expect(localeForOriginalLookup('fr')).toBe('fr');
  });

  it('does not filter on the all-locales wildcard', () => {
    expect(localeForOriginalLookup('*')).toBeUndefined();
  });

  it('ignores a missing locale', () => {
    expect(localeForOriginalLookup(undefined)).toBeUndefined();
    expect(localeForOriginalLookup(['en'])).toBeUndefined();
  });
});
