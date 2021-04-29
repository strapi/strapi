import translationMessages, { languageNativeNames } from '../index';

describe('translations', () => {
  describe('languageNativeNames', () => {
    it('should has native name for every locale', () => {
      const languages = Object.keys(translationMessages);
      languages.forEach(language => {
        expect(typeof languageNativeNames[language] === 'string').toBe(true);
        expect(!!languageNativeNames[language]).toBe(true);
      });
    });
  });
});
