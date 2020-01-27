import React from 'react';
import { Router, Route, Switch } from 'react-router-dom';
import { render, cleanup } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { GlobalContextProvider } from 'strapi-helper-plugin';
import { IntlProvider } from 'react-intl';

import { translationMessages } from '../../../../i18n';

import EditView from '../index';

const history = createMemoryHistory();

describe('Admin | containers | EditView', () => {
  afterEach(cleanup);

  it('should render EditView', () => {
    const intlProvider = new IntlProvider(
      {
        locale: 'en',
        messages: translationMessages.en,
      },
      {}
    );
    const { intl: originalIntl } = intlProvider.getChildContext();

    const { asFragment } = render(
      <IntlProvider locale={intlProvider.locale}>
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
});
