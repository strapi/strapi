import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import ConfirmDialog from '../index';

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} defaultLocale="en" textComponent="span">
      <ConfirmDialog isOpen onConfirm={jest.fn()} onToggleDialog={jest.fn()} />
    </IntlProvider>
  </ThemeProvider>
);

describe('ConfirmDialog', () => {
  it('renders and matches the snapshot', async () => {
    const {
      container: { firstChild },
    } = render(App);

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

  it('renders and matches the snapshot', async () => {
    const AppCustom = (
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} textComponent="span">
          <ConfirmDialog
            bodyText={{
              id: 'app.components',
              defaultMessage: 'Are you sure you want to unpublish it?',
            }}
            isOpen
            onConfirm={jest.fn()}
            onToggleDialog={jest.fn()}
            title={{ id: 'app.components.ConfirmDialog.title', defaultMessage: 'Confirmation' }}
            rightButtonText={{ id: 'global.save', defaultMessage: 'Save' }}
          />
        </IntlProvider>
      </ThemeProvider>
    );

    render(AppCustom);

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to unpublish it?')).toBeInTheDocument();
    });
  });
});
