import { readdirSync } from 'fs-extra';
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
});
