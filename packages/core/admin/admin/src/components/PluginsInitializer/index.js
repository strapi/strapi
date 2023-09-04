import React, { useReducer, useRef } from 'react';

import { LoadingIndicatorPage, useStrapiApp } from '@strapi/helper-plugin';

import Admin from '../../pages/Admin';

import init from './init';
import reducer, { initialState } from './reducer';

const PluginsInitializer = () => {
  const { plugins: appPlugins } = useStrapiApp();
  const [{ plugins }, dispatch] = useReducer(reducer, initialState, () => init(appPlugins));
  const setPlugin = useRef((pluginId) => {
    dispatch({ type: 'SET_PLUGIN_READY', pluginId });
  });

  const hasApluginNotReady = Object.keys(plugins).some(
    (plugin) => plugins[plugin].isReady === false
  );

  /**
   *
   * I have spent some time trying to understand what is happening here, and wanted to
   * leave that knowledge for my future me:
   *
   * `initializer` is an undocumented property of the `registerPlugin` API. At the time
   * of writing it seems only to be used by the i18n plugin.
   *
   * How does it work?
   *
   * Every plugin that has an `initializer` component defined, receives the
   * `setPlugin` function as a component prop. In the case of i18n the plugin fetches locales
   * first and calls `setPlugin` with `pluginId` once they are loaded, which then triggers the
   * reducer of the admin app defined above.
   *
   * Once all plugins are set to `isReady: true` the app renders.
   *
   * This API is used to block rendering of the admin app. We should remove that in v5 completely
   * and make sure plugins can inject data into the global store before they are initialized, to avoid
   * having a new prop-callback based communication channel between plugins and the core admin app.
   *
   */

  if (hasApluginNotReady) {
    const initializers = Object.keys(plugins).reduce((acc, current) => {
      const InitializerComponent = plugins[current].initializer;

      if (InitializerComponent) {
        const key = plugins[current].pluginId;

        acc.push(<InitializerComponent key={key} setPlugin={setPlugin.current} />);
      }

      return acc;
    }, []);

    return (
      <>
        {initializers}
        <LoadingIndicatorPage />
      </>
    );
  }

  return <Admin />;
};

export default PluginsInitializer;
