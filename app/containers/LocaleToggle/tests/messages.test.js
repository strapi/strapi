import assert from 'assert';
import { getLocaleMessages } from '../messages';

describe('getLocaleMessages', () => {
  it('should create i18n messages for all locales', () => {
    const expected = {
      en: {
        id: 'app.components.LocaleToggle.en',
        defaultMessage: 'en',
      },
      fr: {
        id: 'app.components.LocaleToggle.fr',
        defaultMessage: 'fr',
      },
    };

    const actual = getLocaleMessages(['en', 'fr']);

    assert.deepEqual(expected, actual);
  });
});
