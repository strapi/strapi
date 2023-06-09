/**
 *
 * Tests for CreatePage
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Switch, Route } from 'react-router-dom';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { NotificationsProvider } from '@strapi/helper-plugin';

import { CreatePage } from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn(), unlockApp: jest.fn() })),
}));

describe('<CreatePage />', () => {
  beforeAll(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date(2020, 3, 1));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders and matches the snapshot', () => {
    const { container } = render(<CreatePage />, {
      wrapper({ children }) {
        return (
          <IntlProvider locale="en">
            <ThemeProvider theme={lightTheme}>
              <NotificationsProvider>
                <MemoryRouter initialEntries={['/settings/roles/new']}>
                  <Switch>
                    <Route path="/settings/roles/new">{children}</Route>
                  </Switch>
                </MemoryRouter>
              </NotificationsProvider>
            </ThemeProvider>
          </IntlProvider>
        );
      },
    });

    expect(container).toMatchSnapshot();
  });
});
