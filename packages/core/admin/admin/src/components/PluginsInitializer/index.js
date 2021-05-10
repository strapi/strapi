import React, { useReducer, useRef } from 'react';
import { LoadingIndicatorPage, useStrapi } from '@strapi/helper-plugin';
import Admin from '../../pages/Admin';
import init from './init';
import reducer, { initialState } from './reducer';

const PluginsInitializer = () => {
  // TODO rename strapi to avoid mismatch with the window.strapi
  const { strapi: app } = useStrapi();
  const [{ plugins }, dispatch] = useReducer(reducer, initialState, () => init(app.plugins));
  const setPlugin = useRef(pluginId => {
    dispatch({ type: 'SET_PLUGIN_READY', pluginId });
  });

  const hasApluginNotReady = Object.keys(plugins).some(plugin => plugins[plugin].isReady === false);

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

  return <Admin plugins={plugins} />;
};

export default PluginsInitializer;
