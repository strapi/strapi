import * as React from 'react';

import { produce } from 'immer';
import set from 'lodash/set';

import { Page } from '../components/PageHelpers';
import { StrapiAppContextValue, useStrapiApp } from '../features/StrapiApp';

/**
 * TODO: this isn't great, and we really should focus on fixing this.
 */
const PluginsInitializer = ({ children }: { children: React.ReactNode }) => {
  const appPlugins = useStrapiApp('PluginsInitializer', (state) => state.plugins);
  const [{ plugins }, dispatch] = React.useReducer<React.Reducer<State, Action>, State>(
    reducer,
    initialState,
    () => init(appPlugins)
  );
  const setPlugin = React.useRef((pluginId: string) => {
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
    }, [] as React.ReactNode[]);

    return (
      <>
        {initializers}
        <Page.Loading />
      </>
    );
  }

  return children;
};

/* -------------------------------------------------------------------------------------------------
 * Reducer
 * -----------------------------------------------------------------------------------------------*/

interface State {
  plugins: StrapiAppContextValue['plugins'];
}

const initialState: State = {
  plugins: {},
};

type SetPluginReadyAction = {
  type: 'SET_PLUGIN_READY';
  pluginId: string;
};

type Action = SetPluginReadyAction;

const reducer: React.Reducer<State, Action> = (state = initialState, action: Action): State =>
  produce(state, (draftState) => {
    switch (action.type) {
      case 'SET_PLUGIN_READY': {
        set(draftState, ['plugins', action.pluginId, 'isReady'], true);
        break;
      }
      default:
        return draftState;
    }
  });

/* -------------------------------------------------------------------------------------------------
 * Init state
 * -----------------------------------------------------------------------------------------------*/

const init = (plugins: State['plugins']): State => {
  return {
    plugins,
  };
};

export { PluginsInitializer };
