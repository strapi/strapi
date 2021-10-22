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
import Theme from '../../Theme';
import Notifications from '../index';

const messages = {};

describe('<Notifications />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(
      <Theme>
        <IntlProvider locale="en" messages={messages} defaultLocale="en" textComponent="span">
          <Notifications>
            <div />
          </Notifications>
        </IntlProvider>
      </Theme>
    );

    expect(firstChild).toMatchInlineSnapshot(`
      .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-box-pack: space-around;
        -webkit-justify-content: space-around;
        -ms-flex-pack: space-around;
        justify-content: space-around;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c2 {
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
        margin-top: 0px;
      }

      .c1 {
        position: fixed;
        top: 46px;
        right: 0;
        left: 0;
        z-index: 1100;
      }

      <div
        class="c0 c1"
      >
        <div
          class="c2"
        />
      </div>
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
      <Theme>
        <IntlProvider locale="en" defaultLocale="en" messages={messages} textComponent="span">
          <Notifications>
            <Button />
          </Notifications>
        </IntlProvider>
      </Theme>
    );

    // Click button
    fireEvent.click(screen.getByText('display notif'));

    const items = await screen.findAllByText(/simple notif/);

    expect(items).toHaveLength(1);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 2500));
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
      <Theme>
        <IntlProvider locale="en" defaultLocale="en" messages={messages} textComponent="span">
          <Notifications>
            <Button />
          </Notifications>
        </IntlProvider>
      </Theme>
    );

    // Click button
    fireEvent.click(screen.getByText('display notif'));

    const items = await screen.findAllByText(/simple notif/);

    expect(items).toHaveLength(1);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 2500));
    });

    const foundItems = screen.queryAllByText(/simple notif/);

    expect(foundItems).toHaveLength(1);

    fireEvent.click(screen.getByLabelText('Close'));

    const displayedItems = screen.queryAllByText(/simple notif/);

    expect(displayedItems).toHaveLength(0);
  });
});
