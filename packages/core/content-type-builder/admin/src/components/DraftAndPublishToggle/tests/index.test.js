/**
 *
 * Tests for DraftAndPublishToggle
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { IntlProvider } from 'react-intl';
import DraftAndPublishToggle from '../index';

const messages = {
  'content-type-builder.component.name': 'Draft And Publish Toggle',
};

describe('<DraftAndPublishToggle />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={messages} defaultLocale="en">
          <DraftAndPublishToggle />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(firstChild).toMatchInlineSnapshot();
  });
});
