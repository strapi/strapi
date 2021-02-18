import React from 'react';
import { Router, Route, Switch } from 'react-router-dom';
// import { render, cleanup } from '@testing-library/react';
import { shallow } from 'enzyme';
import { createMemoryHistory } from 'history';
import { GlobalContextProvider, UserProvider } from 'strapi-helper-plugin';
import { IntlProvider } from 'react-intl';

import translationMessages from '../../../../translations/en.json';

import ListView from '../index';

const history = createMemoryHistory();

describe('Admin | containers | ListView', () => {
  it('should not crash', () => {
    const intlProvider = new IntlProvider(
      {
        locale: 'en',
        messages: translationMessages,
      },
      {}
    );
    const { intl: originalIntl } = intlProvider.state;

    shallow(
      <IntlProvider
        locale="en"
        defaultLocale="en"
        messages={translationMessages}
        textComponent="span"
      >
        <GlobalContextProvider formatMessage={originalIntl.formatMessage}>
          <UserProvider permissions={[]}>
            <Router history={history}>
              <Switch>
                <Route path="/settings/webhooks">
                  <ListView />
                </Route>
              </Switch>
            </Router>
          </UserProvider>
        </GlobalContextProvider>
      </IntlProvider>
    );
  });

  // FIXME
  // afterEach(cleanup);

  // it('should match the snapshot', () => {
  //   const intlProvider = new IntlProvider(
  //     {
  //       locale: 'en',
  //       messages: translationMessages,
  //     },
  //     {}
  //   );
  //   const { intl: originalIntl } = intlProvider.state;
  //   const { asFragment } = render(
  //     <IntlProvider
  //       locale="en"
  //       defaultLocale="en"
  //       messages={translationMessages}
  //       textComponent="span"
  //     >
  //       <GlobalContextProvider formatMessage={originalIntl.formatMessage}>
  //         <Router history={history}>
  //           <Switch>
  //             <Route>
  //               <ListView />
  //             </Route>
  //           </Switch>
  //         </Router>
  //       </GlobalContextProvider>
  //     </IntlProvider>
  //   );
  //   expect(asFragment()).toMatchSnapshot();
  // });
});
