import React from 'react';
import { Router, Route, Switch } from 'react-router-dom';
import { render, cleanup } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { GlobalContextProvider } from 'strapi-helper-plugin';
import { IntlProvider } from 'react-intl';

import EditView from '../index';

const history = createMemoryHistory();

afterEach(cleanup);

it('renders', () => {
  const intlProvider = new IntlProvider(
    {
      locale: 'en',
      formatMessage: jest.fn(),
    },
    {}
  );
  const { intl: originalIntl } = intlProvider.getChildContext();

  const { asFragment } = render(
    <IntlProvider locale="en" message={{}}>
      <GlobalContextProvider formatMessage={originalIntl.formatMessage}>
        <Router history={history}>
          <Switch>
            <Route>
              <EditView />
            </Route>
          </Switch>
        </Router>
      </GlobalContextProvider>
    </IntlProvider>
  );
  expect(asFragment()).toMatchSnapshot();
});
