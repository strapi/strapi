// import React from 'react';
// import { Router, Route, Switch } from 'react-router-dom';
// import { render, cleanup } from '@testing-library/react';
// import { createMemoryHistory } from 'history';
// import { GlobalContextProvider } from 'strapi-helper-plugin';
// import { IntlProvider } from 'react-intl';

// import translationMessages from '../../../../translations/en.json';

// import EditView from '../index';

// const history = createMemoryHistory();

describe('Admin | containers | EditView', () => {
  it('Should have some tests', () => {
    expect(true).toBe(true);
  });

  // FIXME: snapshots
  //   afterEach(cleanup);

  //   it('should match the snapshot', () => {
  //     const intlProvider = new IntlProvider(
  //       {
  //         locale: 'en',
  //         messages: translationMessages,
  //       },
  //       {}
  //     );
  //     const { intl: originalIntl } = intlProvider.getChildContext();

  //     const { asFragment } = render(
  //       <IntlProvider
  //         locale="en"
  //         defaultLocale="en"
  //         messages={translationMessages}
  //       >
  //         <GlobalContextProvider formatMessage={originalIntl.formatMessage}>
  //           <Router history={history}>
  //             <Switch>
  //               <Route>
  //                 <EditView />
  //               </Route>
  //             </Switch>
  //           </Router>
  //         </GlobalContextProvider>
  //       </IntlProvider>
  //     );

  //     expect(asFragment()).toMatchSnapshot();
  //   });
});
