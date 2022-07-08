/**
 *
 * Tests for EditPage
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Router, Switch, Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { lightTheme, darkTheme } from '@strapi/design-system';
import Theme from '../../../../../../components/Theme';
import ThemeToggleProvider from '../../../../../../components/ThemeToggleProvider';

import EditPage from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => jest.fn()),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn(), unlockApp: jest.fn() })),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
}));

const makeApp = history => (
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
            <Route path="/settings/roles/:id">
              <EditPage />
            </Route>
          </Switch>
        </Router>
      </Theme>
    </ThemeToggleProvider>
  </IntlProvider>
);

describe('<EditPage />', () => {
  let originalDateNow = Date.now;

  beforeEach(() => {
    Date.now = jest.fn(() => new Date(Date.UTC(2021, 1, 30)).valueOf());
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  it('renders and matches the snapshot', () => {
    const history = createMemoryHistory();
    const App = makeApp(history);
    const { container } = render(App);

    history.push('/settings/roles/1');

    expect(container).toMatchSnapshot();
  });
});
