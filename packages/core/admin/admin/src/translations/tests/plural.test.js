const translations = require('../en.json');

describe('translations', () => {
  describe('plural syntax', () => {
    it('should avoid .plural/.singular syntax', () => {
      Object.keys(translations).forEach(translationKey => {
        const keyParts = translationKey.split('.');

        // Skip if the key can not be splitted
        if (keyParts.length < 2) return;

        const lastKeyPart = keyParts.pop();
        expect(lastKeyPart).not.toBe('singular');
        expect(lastKeyPart).not.toBe('plural');
      });
    });
  });
});
