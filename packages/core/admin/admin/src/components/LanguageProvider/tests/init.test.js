import init from '../init';
import './LocaleStorageMock';

const localesNativeNames = { en: 'English', fr: 'Français' };

describe('LanguageProvider | init', () => {
  afterEach(() => {
    localStorage.removeItem('strapi-admin-language');
  });

  it('should return the language from the localStorage', () => {
    localStorage.setItem('strapi-admin-language', 'fr');

    expect(init(localesNativeNames)).toEqual({
      locale: 'fr',
      localesNativeNames,
    });
  });

  it('should return "en" when the strapi-admin-language is not set in the locale storage', () => {
    expect(init(localesNativeNames)).toEqual({
      locale: 'en',
      localesNativeNames,
    });
  });

  it('should return "en" when the language from the local storage is not included in the localesNativeNames', () => {
    localStorage.setItem('strapi-admin-language', 'foo');

    expect(init(localesNativeNames)).toEqual({
      locale: 'en',
      localesNativeNames,
    });
  });
});
