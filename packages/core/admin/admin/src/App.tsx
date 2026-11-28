/**
 *
 * App.js
 *
 */
import { Suspense } from 'react';

import { Outlet } from 'react-router-dom';

import { GlobalNotifications } from '../../ee/admin/src/components/GlobalNotifications';

import { Page } from './components/PageHelpers';
import { Providers } from './components/Providers';

import type { Store } from './core/store/configure';
import type { StrapiApp } from './StrapiApp';

interface AppProps {
  strapi: StrapiApp;
  store: Store;
}

const App = ({ strapi, store }: AppProps) => {
  /**
   * @internal
   * @experimental
   *
   * The `future-global::` namespace is intended for internal use.
   * It is experimental and could change or be removed in the future.
   */
  const globalComponents = Object.entries(strapi.library.components)
    .filter(([name]) => name.startsWith('future-global::'))
    .map(([name, Component]) => ({ name, Component }));

  return (
    <Providers strapi={strapi} store={store}>
      <Suspense fallback={<Page.Loading />}>
        <GlobalNotifications />
        {!window.strapi.featureFlags.isEnabled('useLegacyMediaLibrary') &&
          globalComponents.map(({ name, Component }) => <Component key={name} />)}
        <Outlet />
      </Suspense>
    </Providers>
  );
};

export { App };
export type { AppProps };
