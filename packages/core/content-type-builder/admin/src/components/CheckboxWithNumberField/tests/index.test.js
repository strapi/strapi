/**
 *
 * Tests for CheckboxWithNumberField
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { IntlProvider } from 'react-intl';
import CheckboxWithNumberField from '../index';

const messages = {
  'content-type-builder.component.name': 'Checkbox With Number Field',
};

describe('<CheckboxWithNumberField />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={messages} defaultLocale="en">
          <CheckboxWithNumberField />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(firstChild).toMatchInlineSnapshot();
  });
});
