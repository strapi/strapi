/**
 *
 * Tests for RequiredCheckbox
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import RequiredCheckbox from '../index';

const messages = {
  'content-type-builder.component.name': 'Required Checkbox',
};

describe('<RequiredCheckbox />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={messages} defaultLocale="en">
          <RequiredCheckbox />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(firstChild).toMatchInlineSnapshot();
  });
});
