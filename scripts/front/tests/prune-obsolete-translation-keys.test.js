'use strict';

const {
  getObsoleteKeys,
  pruneObsoleteKeysFromJSON,
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
  };

  it('should identify keys that no longer exist in en.json', () => {
    expect(getObsoleteKeys(baseTranslation, localeTranslation)).toEqual([
      'Auth.components.Oops.text.admin',
      'Auth.form.button.forgot-password',
    ]);
  });

  it('should remove obsolete keys while preserving valid translations', () => {
    expect(pruneObsoleteKeysFromJSON(baseTranslation, localeTranslation)).toEqual({
      'Auth.components.Oops.text': 'Your account has been suspended.',
      'Auth.components.Oops.title': 'Oops...',
      'Auth.form.button.go-home': 'GO BACK HOME',
    });
  });
});
