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
      .c0 {
        border: 0;
        -webkit-clip: rect(0 0 0 0);
        clip: rect(0 0 0 0);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        width: 1px;
      }

      <div
        class="c0"
      >
        <p
          aria-live="polite"
          aria-relevant="all"
          id="live-region-log"
          role="log"
        />
        <p
          aria-live="polite"
          aria-relevant="all"
          id="live-region-status"
          role="status"
        />
        <p
          aria-live="assertive"
          aria-relevant="all"
          id="live-region-alert"
          role="alert"
        />
      </div>
    `);
  });
});
