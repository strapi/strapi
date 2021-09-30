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
import moment from 'moment';
import Theme from '../../../../../../../../admin/src/components/Theme';

import { CreatePage } from '../index';

jest.mock('moment', () => {
  const mMoment = {
    format: jest.fn().mockReturnThis(),
    valueOf: jest.fn(),
  };

  return jest.fn(() => mMoment);
});

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
  </IntlProvider>
);

describe('<CreatePage />', () => {
  it('renders and matches the snapshot', () => {
    moment()
      .format.mockReturnValueOnce('2021–01–30T12:34:56+00:00')
      .mockReturnValueOnce('01–30-2021');
    const history = createMemoryHistory();
    const App = makeApp(history);
    const { container } = render(App);

    history.push('/settings/roles/new');

    expect(container).toMatchSnapshot();
  });
});
