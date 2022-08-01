/**
 *
 * Tests for CreatePage
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Router, Switch, Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { lightTheme, darkTheme } from '@strapi/design-system';
import Theme from '../../../../../../../../admin/src/components/Theme';
import ThemeToggleProvider from '../../../../../../../../admin/src/components/ThemeToggleProvider';

import { CreatePage } from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => jest.fn()),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn(), unlockApp: jest.fn() })),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
}));

const makeApp = history => (
  <IntlProvider
    messages={{ 'Settings.roles.form.created': 'Created' }}
    textComponent="span"
    locale="en"
    defaultLocale="en"
  >
    <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
      <Theme>
        <Router history={history}>
          <Switch>
            <Route path="/settings/roles/duplicate/:id">
              <CreatePage />
            </Route>
            <Route path="/settings/roles/new">
              <CreatePage />
            </Route>
          </Switch>
        </Router>
      </Theme>
    </ThemeToggleProvider>
  </IntlProvider>
);

describe('<CreatePage />', () => {
  beforeAll(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date(2020, 3, 1));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders and matches the snapshot', () => {
    const history = createMemoryHistory();
    const App = makeApp(history);
    const { container } = render(App);

    history.push('/settings/roles/new');

    expect(container).toMatchSnapshot();
  });
});
