import init from '../init';

const localeNames = { en: 'English', fr: 'Français' };

describe('LanguageProvider | init', () => {
  afterEach(() => {
    localStorage.removeItem('strapi-admin-language');
  });

  it('should return the language from the localStorage', () => {
    localStorage.setItem('strapi-admin-language', 'fr');

    expect(init(localeNames)).toEqual({
      locale: 'fr',
      localeNames,
    });
  });

  it('should return "en" when the strapi-admin-language is not set in the locale storage', () => {
    expect(init(localeNames)).toEqual({
      locale: 'en',
      localeNames,
    });
  });

  it('should return "en" when the language from the local storage is not included in the localeNames', () => {
    localStorage.setItem('strapi-admin-language', 'foo');

    expect(init(localeNames)).toEqual({
      locale: 'en',
      localeNames,
    });
  });
});
