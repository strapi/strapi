/**
 *
 * Tests for EditPage
 *
 */

import React from 'react';

import { darkTheme, lightTheme } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Route, Router, Switch } from 'react-router-dom';

import Theme from '../../../../../../components/Theme';
import ThemeToggleProvider from '../../../../../../components/ThemeToggleProvider';
import EditPage from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => jest.fn()),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn(), unlockApp: jest.fn() })),
}));

const setup = (props) =>
  render(<EditPage {...props} />, {
    wrapper({ children }) {
      const history = createMemoryHistory({
        initialEntries: ['/settings/roles/1'],
      });
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <QueryClientProvider client={client}>
          <IntlProvider
            messages={{ 'Settings.roles.form.created': 'created' }}
            textComponent="span"
            locale="en"
            defaultLocale="en"
          >
            <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
              <Theme>
                <Router history={history}>
                  <Switch>
                    <Route path="/settings/roles/:id">{children}</Route>
                  </Switch>
                </Router>
              </Theme>
            </ThemeToggleProvider>
          </IntlProvider>
        </QueryClientProvider>
      );
    },
  });

describe('<EditPage />', () => {
  // TODO: make this an actual useful test
  it('renders and matches the snapshot', () => {
    const { container } = setup();

    expect(container).toMatchSnapshot();
  });
});
