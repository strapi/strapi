import { createIntl } from 'react-intl';

import messages from '../zh.json';

describe('Traditional Chinese component selection', () => {
  const intl = createIntl({
    locale: 'zh',
    messages,
    onError: (error) => {
      throw error;
    },
  });

  it.each([0, 1, 3])('formats the label for %i selected components', (number) => {
    expect(
      intl.formatMessage({ id: 'components.SelectComponents.displayed-value' }, { number })
    ).toBe(`已選擇 ${number} 個元件`);
  });
});
