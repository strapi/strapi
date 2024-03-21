/**
 *
 * App.js
 *
 */
import { Suspense } from 'react';

import { Helmet } from 'react-helmet';
import { Outlet } from 'react-router-dom';

import { Page } from './components/PageHelpers';
import { Providers } from './components/Providers';
import { LANGUAGE_LOCAL_STORAGE_KEY } from './reducer';

import type { Store } from './core/store/configure';
import type { StrapiApp } from './StrapiApp';

interface AppProps {
  strapi: StrapiApp;
  store: Store;
}

const App = ({ strapi, store }: AppProps) => {
  return (
    <Providers strapi={strapi} store={store}>
      <Suspense fallback={<Page.Loading />}>
        <Helmet
          htmlAttributes={{ lang: localStorage.getItem(LANGUAGE_LOCAL_STORAGE_KEY) || 'en' }}
        />
        <Outlet />
      </Suspense>
    </Providers>
  );
};

export { App };
export type { AppProps };
