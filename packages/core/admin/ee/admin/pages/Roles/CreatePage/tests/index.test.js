/**
 *
 * Tests for CreatePage
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Router, Switch, Route } from 'react-router';
import { createMemoryHistory } from 'history';
import Theme from '../../../../../../admin/src/components/Theme';
import { CreatePage } from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => jest.fn()),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn(), unlockApp: jest.fn() })),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
}));

const makeApp = history => (
  <IntlProvider messages={{ en: {} }} textComponent="span" locale="en">
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
    const history = createMemoryHistory();
    const App = makeApp(history);
    const { container } = render(App);

    history.push('/settings/roles/new');

    expect(container).toMatchSnapshot();
  });
});
