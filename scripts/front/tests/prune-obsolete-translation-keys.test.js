'use strict';

const {
  getObsoleteKeys,
  pruneObsoleteKeysFromJSON,
  getMisplacedKeyActions,
  getPreservedKeys,
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

  it('should keep a key present in source but absent from en.json', () => {
    const referencedKeys = new Set(['Auth.form.button.forgot-password']);

    expect(getObsoleteKeys(baseTranslation, localeTranslation, referencedKeys)).toEqual([
      'Auth.components.Oops.text.admin',
      'upload.generic-error',
    ]);

    expect(pruneObsoleteKeysFromJSON(baseTranslation, localeTranslation, referencedKeys)).toEqual({
      'Auth.components.Oops.text': 'Your account has been suspended.',
      'Auth.components.Oops.title': 'Oops...',
      'Auth.form.button.go-home': 'GO BACK HOME',
      'Auth.form.button.forgot-password': 'Send Email',
    });

    const actions = getMisplacedKeyActions({
      sourcePackageDir: 'packages/core/admin',
      localeTranslation,
      baseTranslation,
      ownersByKey: new Map(),
      referencedKeys,
    });

    expect(actions.map((action) => action.key)).toEqual([
      'Auth.components.Oops.text.admin',
      'upload.generic-error',
    ]);
  });

  it('should keep ambiguous keys instead of dropping them', () => {
    const localeTranslationWithAmbiguousKey = {
      'page.title': 'Impostazioni - Libreria Multimediale',
      'upload.generic-error': 'Upload failed',
    };
    const ownersByKey = new Map([
      [
        'page.title',
        [
          { packageDir: 'packages/core/upload', packageName: 'core/upload' },
          {
            packageDir: 'packages/plugins/users-permissions',
            packageName: 'plugins/users-permissions',
          },
        ],
      ],
      [
        'upload.generic-error',
        [{ packageDir: 'packages/core/upload', packageName: 'core/upload' }],
      ],
    ]);

    const preservedKeys = getPreservedKeys({
      sourcePackageDir: 'packages/core/admin',
      localeTranslation: localeTranslationWithAmbiguousKey,
      baseTranslation,
      ownersByKey,
      referencedKeys: new Set(),
    });

    expect([...preservedKeys]).toEqual(['page.title']);
    expect(
      getObsoleteKeys(baseTranslation, localeTranslationWithAmbiguousKey, preservedKeys)
    ).toEqual(['upload.generic-error']);
    expect(
      pruneObsoleteKeysFromJSON(baseTranslation, localeTranslationWithAmbiguousKey, preservedKeys)
    ).toEqual({
      'page.title': 'Impostazioni - Libreria Multimediale',
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
