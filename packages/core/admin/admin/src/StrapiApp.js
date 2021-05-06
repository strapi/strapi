import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from 'react-query';
import configureStore from './core/store/configureStore';
import basename from './utils/basename';
import App from './containers/App';
import LanguageProvider from './containers/LanguageProvider';
import Fonts from './components/Fonts';
import GlobalStyle from './components/GlobalStyle';
import Notifications from './components/Notifications';
import Theme from './components/Theme';

import reducers from './reducers';

// TODO
import translationMessages from './translations';

window.strapi = {
  backendURL: process.env.STRAPI_ADMIN_BACKEND_URL,
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

class StrapiApp {
  plugins = {};

  reducers = { ...reducers };

  async initialize() {
    console.log('initializing');

    return this;
  }

  async boot() {
    console.log('booting');

    return this;
  }

  render() {
    const store = configureStore(this);

    return (
      <QueryClientProvider client={queryClient}>
        <Theme>
          <GlobalStyle />
          <Fonts />
          <Provider store={store}>
            <LanguageProvider messages={translationMessages}>
              <>
                <Notifications />
                <BrowserRouter basename={basename}>
                  <App store={store} />
                </BrowserRouter>
              </>
            </LanguageProvider>
          </Provider>
        </Theme>
      </QueryClientProvider>
    );
  }
}

export default () => new StrapiApp();
