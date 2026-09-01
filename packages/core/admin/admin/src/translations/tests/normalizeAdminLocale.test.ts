import { normalizeAdminLocale } from '../normalizeAdminLocale';

describe('normalizeAdminLocale', () => {
  it('maps legacy dk to da', () => {
    expect(normalizeAdminLocale('dk')).toBe('da');
  });

  it('leaves other locales unchanged', () => {
    expect(normalizeAdminLocale('en')).toBe('en');
    expect(normalizeAdminLocale('fr')).toBe('fr');
    expect(normalizeAdminLocale('da')).toBe('da');
  });
});
