/**
 *
 * Tests for FormModalEndActions
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { IntlProvider } from 'react-intl';
import FormModalEndActions from '../index';

const messages = {
  'content-type-builder.component.name': 'Form Modal End Actions',
};

describe('<FormModalEndActions />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={messages} defaultLocale="en">
          <FormModalEndActions />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(firstChild).toMatchInlineSnapshot();
  });
});
