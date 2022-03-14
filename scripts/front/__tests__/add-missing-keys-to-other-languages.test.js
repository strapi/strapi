'use strict';

const fs = require('fs-extra');
const { addMissingKeyForSingleFile } = require('../add-missing-keys-to-other-languages');

// Do not run this test in --watch mode.
// Since `addMissingKeyForSingleFile` makes changes to the files (`en.json`, `vi.json`),
// accidentally triggering this test to re-run infinite times (because of jest watch mode)
describe('addMissingKeyForSingleFile', () => {
  it('should add missing keys from en.json to translation file', async () => {
    const TARGET_TRANSLATION_FILE_PATH = 'scripts/front/__tests__/vi.json';
    const SOURCE_TRANSLATION_FILE_PATH = 'scripts/front/__tests__/en.json';
    // Save original `vi.json` file content
    const originalTargetTranslationFileContent = fs.readFileSync(
      TARGET_TRANSLATION_FILE_PATH,
      'utf8'
    );
    const originalTargetTranslationFileJSON = JSON.parse(originalTargetTranslationFileContent);
    const mainTranslationFileJSON = await fs.readJSON(SOURCE_TRANSLATION_FILE_PATH);

    // Add missing keys for `vi.json`
    await addMissingKeyForSingleFile(TARGET_TRANSLATION_FILE_PATH);
    const updatedTargetTranslationFileJSON = JSON.parse(
      fs.readFileSync(TARGET_TRANSLATION_FILE_PATH, 'utf8')
    );

    // `vi.json` should have all keys from `en.json`
    Object.keys(mainTranslationFileJSON).forEach((key) => {
      expect(key in updatedTargetTranslationFileJSON).toBe(true);
    });

    // `vi.json` should keep the current translation
    Object.keys(originalTargetTranslationFileContent).forEach((key) => {
      expect(updatedTargetTranslationFileJSON[key]).toEqual(originalTargetTranslationFileJSON[key]);
    });

    // Restore original `vi.json` file content
    await fs.writeJSON(TARGET_TRANSLATION_FILE_PATH, originalTargetTranslationFileJSON, {
      spaces: 2,
    });
  });
});
