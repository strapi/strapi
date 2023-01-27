'use strict';

const fs = require('fs-extra');
const { updateMissingKeysToJSON } = require('../add-missing-keys-to-other-language');

describe('updateMissingKeysToJSON', () => {
  it('should add missing keys from en.json to translation file', async () => {
    const TARGET_TRANSLATION_FILE_PATH = 'scripts/front/tests/vi.json';
    const SOURCE_TRANSLATION_FILE_PATH = 'scripts/front/tests/en.json';
    // Save original `vi.json` file content
    const originalTargetTranslationFileContent = fs.readFileSync(
      TARGET_TRANSLATION_FILE_PATH,
      'utf8'
    );
    const originalTargetTranslationFileJSON = JSON.parse(originalTargetTranslationFileContent);
    const mainTranslationFileJSON = await fs.readJSON(SOURCE_TRANSLATION_FILE_PATH);

    // Add missing keys for `vi.json`
    const updatedTargetTranslationFileJSON = await updateMissingKeysToJSON(
      TARGET_TRANSLATION_FILE_PATH
    );

    // `vi.json` should have all keys from `en.json`
    Object.keys(mainTranslationFileJSON).forEach((key) => {
      expect(key in updatedTargetTranslationFileJSON).toBe(true);
    });

    // `vi.json` should keep the current translation
    Object.keys(originalTargetTranslationFileContent).forEach((key) => {
      expect(updatedTargetTranslationFileJSON[key]).toEqual(originalTargetTranslationFileJSON[key]);
    });
  });
});
