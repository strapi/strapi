/**
 *
 * Tests for SelectComponent
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { IntlProvider } from 'react-intl';
import SelectComponent from '../index';

const messages = {
  'content-type-builder.component.name': 'Select Component',
};

describe('<SelectComponent />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={messages} defaultLocale="en">
          <SelectComponent />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(firstChild).toMatchInlineSnapshot();
  });
});
