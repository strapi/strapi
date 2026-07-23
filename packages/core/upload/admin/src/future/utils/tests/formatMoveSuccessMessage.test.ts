import { createIntl } from 'react-intl';

import { formatMoveSuccessMessage } from '../formatMoveSuccessMessage';

// No messages registered → formatMessage resolves the ICU defaultMessage, which
// mirrors the string stored in translations/en.json.
const { formatMessage } = createIntl({ locale: 'en', messages: {} });

describe('formatMoveSuccessMessage', () => {
  it('uses the singular form for a single element', () => {
    expect(
      formatMoveSuccessMessage({
        formatMessage,
        count: 1,
        source: 'About',
        destination: 'Images',
      })
    ).toBe('1 element has been moved from About to Images');
  });

  it('uses the plural form for multiple elements', () => {
    expect(
      formatMoveSuccessMessage({
        formatMessage,
        count: 3,
        source: 'About',
        destination: 'Images',
      })
    ).toBe('3 elements have been moved from About to Images');
  });

  it('interpolates the source and destination labels', () => {
    expect(
      formatMoveSuccessMessage({
        formatMessage,
        count: 2,
        source: 'Media Library',
        destination: 'Logos',
      })
    ).toBe('2 elements have been moved from Media Library to Logos');
  });
});
