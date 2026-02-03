import { readFileSync, readdirSync } from 'fs-extra';
import path from 'path';

import { languageNativeNames } from '../languageNativeNames';

// eslint-disable-next-line no-undef
const languages = readdirSync(path.join(__dirname, '..'))
  .filter((file) => file.includes('.json'))
  .map((file) => file.replace('.json', '')) as Array<keyof typeof languageNativeNames>;

describe('translations', () => {
  describe('languageNativeNames', () => {
    it('should has native name for every locale', () => {
      languages.forEach((language) => {
        expect(typeof languageNativeNames[language] === 'string').toBe(true);
        expect(!!languageNativeNames[language]).toBe(true);
      });
    });
  });

  describe('required Auth.form translations', () => {
    const requiredKeys = ['Auth.form.welcome.title', 'Auth.form.register.subtitle'];

    it('should have all required Auth.form translations in every locale', () => {
      languages.forEach((language) => {
        const filePath = path.join(__dirname, '..', `${language}.json`);
        const translations = JSON.parse(readFileSync(filePath, 'utf8'));

        requiredKeys.forEach((key) => {
          expect(translations).toHaveProperty(key);
          expect(typeof translations[key]).toBe('string');
          expect(translations[key].length).toBeGreaterThan(0);
        });
      });
    });
  });
});
