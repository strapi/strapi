const translations = require('../en.json');

describe('translations', () => {
  describe('plural syntax', () => {
    it('should avoid .plural/.singular syntax', () => {
      Object.keys(translations).forEach((translationKey) => {
        const keyParts = translationKey.split('.');
        const lastKeyPart = keyParts.pop();

        // Skip if the key cannot be splitted
        // Fail only if a PAIR of .singular/.plural keys is found
        if (keyParts.length > 1 && lastKeyPart === 'singular') {
          keyParts.push('plural');
          const pluralKey = keyParts.join('.');

          expect(translations[pluralKey]).toBeUndefined();
        }
      });
    });
  });
});
