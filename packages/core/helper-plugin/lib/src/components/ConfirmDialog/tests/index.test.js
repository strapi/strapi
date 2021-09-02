import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import ConfirmDialog from '../index';

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{ en: {} }} textComponent="span">
      <ConfirmDialog isVisible={true} onConfirm={jest.fn()} onToggleDialog={jest.fn()} />
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
          id="live-region-log"
          role="log"
        />
        <p
          aria-live="polite"
          id="live-region-status"
          role="status"
        />
        <p
          aria-live="assertive"
          id="live-region-alert"
          role="alert"
        />
      </div>
    `);
  });

  it('renders and matches the snapshot', async () => {
    const {
      container: { firstChild },
    } = render(App);

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to delete this?')).toBeInTheDocument();
    });
  });

  it('renders and matches the snapshot', async () => {
    const AppCustom = (
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{ en: {} }} textComponent="span">
          <ConfirmDialog
            bodyText={{
              id: 'app.components',
              defaultMessage: 'Are you sure you want to unpublish it?',
            }}
            isVisible={true}
            onConfirm={jest.fn()}
            onToggleDialog={jest.fn()}
            title={{ id: 'app.components.ConfirmDialog.title', defaultMessage: 'Confirmation' }}
            rightButtonText={{ id: 'app.components.Button.save', defaultMessage: 'Save' }}
          />
        </IntlProvider>
      </ThemeProvider>
    );

    const {
      container: { firstChild },
    } = render(AppCustom);

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to unpublish it?')).toBeInTheDocument();
    });
  });
});
