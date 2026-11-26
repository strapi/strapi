import { createIntl } from 'react-intl';

import { getTranslation, prefixPluginTranslations } from '../../utils/translations';
import translations from '../zh.json';

describe('Traditional Chinese list item count', () => {
  const intl = createIntl({
    locale: 'zh',
    messages: prefixPluginTranslations(translations, 'content-manager'),
  });

  it.each([0, 1, 12])('includes the count for %i items', (number) => {
    expect(intl.formatMessage({ id: getTranslation('containers.list.items') }, { number })).toBe(
      `${number} 項`
    );
  });
});
