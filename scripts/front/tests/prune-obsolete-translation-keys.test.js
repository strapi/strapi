'use strict';

const {
  getObsoleteKeys,
  pruneObsoleteKeysFromJSON,
  getMisplacedKeyActions,
} = require('../prune-obsolete-translation-keys');

describe('prune-obsolete-translation-keys', () => {
  const baseTranslation = {
    'Auth.components.Oops.text': 'Your account has been suspended.',
    'Auth.components.Oops.title': 'Oops...',
    'Auth.form.button.go-home': 'GO BACK HOME',
  };

  const localeTranslation = {
    'Auth.components.Oops.text': 'Your account has been suspended.',
    'Auth.components.Oops.text.admin': 'If this is a mistake, please contact your administrator.',
    'Auth.components.Oops.title': 'Oops...',
    'Auth.form.button.forgot-password': 'Send Email',
    'Auth.form.button.go-home': 'GO BACK HOME',
    'upload.generic-error': 'Upload failed',
  };

  it('should identify keys that no longer exist in en.json', () => {
    expect(getObsoleteKeys(baseTranslation, localeTranslation)).toEqual([
      'Auth.components.Oops.text.admin',
      'Auth.form.button.forgot-password',
      'upload.generic-error',
    ]);
  });

  it('should remove obsolete keys while preserving valid translations', () => {
    expect(pruneObsoleteKeysFromJSON(baseTranslation, localeTranslation)).toEqual({
      'Auth.components.Oops.text': 'Your account has been suspended.',
      'Auth.components.Oops.title': 'Oops...',
      'Auth.form.button.go-home': 'GO BACK HOME',
    });
  });

  it('should classify misplaced keys for migration to another package', () => {
    const ownersByKey = new Map([
      [
        'upload.generic-error',
        [{ packageDir: 'packages/core/upload', packageName: 'core/upload' }],
      ],
    ]);

    const actions = getMisplacedKeyActions({
      sourcePackageDir: 'packages/core/admin',
      localeTranslation,
      baseTranslation,
      ownersByKey,
    });

    expect(actions).toEqual([
      {
        key: 'Auth.components.Oops.text.admin',
        type: 'remove',
      },
      {
        key: 'Auth.form.button.forgot-password',
        type: 'remove',
      },
      {
        key: 'upload.generic-error',
        value: 'Upload failed',
        type: 'migrate',
        targetPackageDir: 'packages/core/upload',
        targetPackageName: 'core/upload',
      },
    ]);
  });
});
