import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import configureStore from './core/store/configureStore';
import basename from './utils/basename';
import App from './containers/App';
import LanguageProvider from './containers/LanguageProvider';
import Fonts from './components/Fonts';
import GlobalStyle from './components/GlobalStyle';
import Notifications from './components/Notifications';
import reducers from './reducers';

// TODO
import translationMessages from './translations';

window.strapi = {
  backendURL: process.env.STRAPI_ADMIN_BACKEND_URL,
};

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
      <Provider store={store}>
        <GlobalStyle />
        <Notifications />
        <Fonts />
        <LanguageProvider messages={translationMessages}>
          <BrowserRouter basename={basename}>
            <App store={store} />
          </BrowserRouter>
        </LanguageProvider>
      </Provider>
    );
  }
}

export default () => new StrapiApp();
