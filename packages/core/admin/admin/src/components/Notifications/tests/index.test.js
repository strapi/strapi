/**
 *
 * Tests for Notifications
 *
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { useNotification } from '@strapi/helper-plugin';
import { act } from 'react-dom/test-utils';
import { lightTheme, darkTheme } from '@strapi/design-system';
import Theme from '../../Theme';
import ThemeToggleProvider from '../../ThemeToggleProvider';
import Notifications from '../index';

const messages = {};

describe('<Notifications />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(
      <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
        <Theme>
          <IntlProvider locale="en" messages={messages} defaultLocale="en" textComponent="span">
            <Notifications>
              <div />
            </Notifications>
          </IntlProvider>
        </Theme>
      </ThemeToggleProvider>
    );

    expect(firstChild).toMatchInlineSnapshot(`
      .c0 {
        margin-left: -250px;
        position: fixed;
        left: 50%;
        top: 2.875rem;
        z-index: 10;
        width: 31.25rem;
      }

      .c1 {
        -webkit-align-items: stretch;
        -webkit-box-align: stretch;
        -ms-flex-align: stretch;
        align-items: stretch;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c2 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c2 > * + * {
        margin-top: 8px;
      }

      <div
        class="c0 c1 c2"
        spacing="2"
        width="31.25rem"
      />
    `);
  });

  it('should display a notification correctly', async () => {
    const Button = () => {
      const toggleNotification = useNotification();

      const handleClick = () => {
        toggleNotification({ type: 'success', message: 'simple notif' });
      };

      return (
        <button onClick={handleClick} type="button">
          display notif
        </button>
      );
    };

    render(
      <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
        <Theme>
          <IntlProvider locale="en" defaultLocale="en" messages={messages} textComponent="span">
            <Notifications>
              <Button />
            </Notifications>
          </IntlProvider>
        </Theme>
      </ThemeToggleProvider>
    );

    // Click button
    fireEvent.click(screen.getByText('display notif'));

    const items = await screen.findAllByText(/simple notif/);

    expect(items).toHaveLength(1);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
    });

    const foundItems = screen.queryAllByText(/simple notif/);

    expect(foundItems).toHaveLength(0);
  });

  it('should display a notification correctly and not toggle it', async () => {
    const Button = () => {
      const toggleNotification = useNotification();

      const handleClick = () => {
        toggleNotification({ type: 'success', message: 'simple notif', blockTransition: true });
      };

      return (
        <button onClick={handleClick} type="button">
          display notif
        </button>
      );
    };

    render(
      <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
        <Theme>
          <IntlProvider locale="en" defaultLocale="en" messages={messages} textComponent="span">
            <Notifications>
              <Button />
            </Notifications>
          </IntlProvider>
        </Theme>
      </ThemeToggleProvider>
    );

    // Click button
    fireEvent.click(screen.getByText('display notif'));

    const items = await screen.findAllByText(/simple notif/);

    expect(items).toHaveLength(1);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
    });

    const foundItems = screen.queryAllByText(/simple notif/);

    expect(foundItems).toHaveLength(1);

    fireEvent.click(screen.getByLabelText('Close'));

    const displayedItems = screen.queryAllByText(/simple notif/);

    expect(displayedItems).toHaveLength(0);
  });
});
