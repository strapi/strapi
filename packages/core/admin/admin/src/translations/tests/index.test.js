const fs = require('fs-extra');
const path = require('path');
const languageNativeNames = require('../languageNativeNames').default;

const languages = fs
  .readdirSync(path.join(__dirname, '..'))
  .filter(file => file.includes('.json'))
  .map(file => file.replace('.json', ''));

describe('translations', () => {
  describe('languageNativeNames', () => {
    it('should has native name for every locale', () => {
      languages.forEach(language => {
        expect(typeof languageNativeNames[language] === 'string').toBe(true);
        expect(!!languageNativeNames[language]).toBe(true);
      });
    });
  });
});
