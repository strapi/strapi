/**
 *
 * Tests for FormModal
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import FormModal from '../index';

const messages = {
  en: {
    'users-permissions.component.name': 'Form Modal',
  },
};

describe('<FormModal />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(
      <IntlProvider locale="en" messages={messages} textComponent="span">
        <FormModal />
      </IntlProvider>
    );

    expect(firstChild).toMatchInlineSnapshot();
  });
});
