import React from 'react';
import { Router } from 'react-router-dom';
import { StrapiAppProvider, AppInfosContext } from '@strapi/helper-plugin';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
// eslint-disable-next-line import/no-unresolved
import { createMemoryHistory } from 'history';
import { fixtures } from '../../../../../../../admin-test-utils';
import en from '../../../translations/en.json';
import LanguageProvider from '../../../components/LanguageProvider';
import Notifications from '../../../components/Notifications';
import RBACProvider from '../../../components/RBACProvider';
import Admin from '../index';

const messages = { en };
const localeNames = { en: 'English' };

const store = fixtures.store.store;

const makeApp = history => (
  <Provider store={store}>
    <StrapiAppProvider menu={[]} plugins={[]}>
      <LanguageProvider messages={messages} localeNames={localeNames}>
        <Notifications>
          <AppInfosContext.Provider
            value={{ latestStrapiReleaseTag: 'v4', shouldUpdateStrapi: false }}
          >
            <RBACProvider permissions={[]} refetchPermissions={jest.fn()}>
              <Router history={history}>
                <Admin />
              </Router>
            </RBACProvider>
          </AppInfosContext.Provider>
        </Notifications>
      </LanguageProvider>
    </StrapiAppProvider>
  </Provider>
);

describe('<Admin />', () => {
  it('should not crash', () => {
    const history = createMemoryHistory();
    const App = makeApp(history);

    const { container } = render(App);

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
        position: fixed;
        top: 72px;
        left: 0;
        right: 0;
        z-index: 1100;
        list-style: none;
        width: 100%;
        overflow-y: hidden;
        pointer-events: none;
      }

      <div
        class="c0"
      />
    `);
  });
});
