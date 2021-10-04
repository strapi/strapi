/**
 *
 * Tests for EditAssetDialog
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { IntlProvider } from 'react-intl';
import { EditAssetDialog } from '../index';

const messages = {
  'upload.component.name': 'Edit Asset Dialog',
};

describe('<EditAssetDialog />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={messages} defaultLocale="en">
          <EditAssetDialog />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(firstChild).toMatchInlineSnapshot(`
      <div>
        <p>
          Edit Asset Dialog
        </p>
      </div>
    `);
  });
});
