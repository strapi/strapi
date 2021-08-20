import React from 'react';
import { Router, Route, Switch } from 'react-router-dom';
import { shallow } from 'enzyme';
import { createMemoryHistory } from 'history';
import { GlobalContextProvider } from '@strapi/helper-plugin';
import { IntlProvider } from 'react-intl';

import translationMessages from '../../../translations/en.json';

import ProvidersPage from '../index';

const history = createMemoryHistory();

describe('Admin | containers | ProvidersPage', () => {
  it('should not crash', () => {
    shallow(
      <IntlProvider
        locale="en"
        defaultLocale="en"
        messages={translationMessages}
        textComponent="span"
      >
        <GlobalContextProvider formatMessage={jest.fn()}>
          <Router history={history}>
            <Switch>
              <Route path="/settings/users-permissions/providers">
                <ProvidersPage />
              </Route>
            </Switch>
          </Router>
        </GlobalContextProvider>
      </IntlProvider>
    );
  });
});
