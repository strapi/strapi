// import React from 'react';
// import { Router, Route, Switch } from 'react-router-dom';
// import { shallow } from 'enzyme';
// import { createMemoryHistory } from 'history';
// import { GlobalContextProvider } from '@strapi/helper-plugin';
// import { IntlProvider } from 'react-intl';
// import Notifications from '../../../../components/Notifications';

// import translationMessages from '../../../../translations/en.json';

// import ListView from '../index';

// const history = createMemoryHistory();

describe('Admin | containers | ListView', () => {
  test.todo('should not crash');
  // it('should not crash', () => {
  //   shallow(
  //     <IntlProvider
  //       locale="en"
  //       defaultLocale="en"
  //       messages={translationMessages}
  //       textComponent="span"
  //     >
  //       <Notifications>
  //         <GlobalContextProvider formatMessage={jest.fn()}>
  //           <Router history={history}>
  //             <Switch>
  //               <Route path="/settings/webhooks">
  //                 <ListView />
  //               </Route>
  //             </Switch>
  //           </Router>
  //         </GlobalContextProvider>
  //       </Notifications>
  //     </IntlProvider>
  //   );
  // });

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
