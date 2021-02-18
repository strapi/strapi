/* eslint-disable */
import React from 'react';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { ReactReduxContext } from 'react-redux';

import getInjectors from './reducerInjectors';

/**
 * Dynamically injects a reducer
 *
 * @param {string} key A key of the reducer
 * @param {function} reducer A reducer that will be injected
 *
 */
export default ({ key, reducer, pluginId }) => WrappedComponent => {
  class ReducerInjector extends React.Component {
    static WrappedComponent = WrappedComponent;
    static displayName = `withReducer(${WrappedComponent.displayName ||
      WrappedComponent.name ||
      'Component'})`;

    static contextType = ReactReduxContext;

    constructor(props, context) {
      super(props, context);
      const reducerName = pluginId ? `${pluginId}_${key}` : key;

      console.warn(
        'Warning: strapi.injectReducer will be removed in the next major release. \n Please update your code.'
      );

      getInjectors(context.store).injectReducer(reducerName, reducer);
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }
  }

  return hoistNonReactStatics(ReducerInjector, WrappedComponent);
};

const useInjectReducer = ({ key, reducer, pluginId }) => {
  const context = React.useContext(ReactReduxContext);
  const reducerName = pluginId ? `${pluginId}_${key}` : key;

  React.useEffect(() => {
    console.warn(
      'Warning: strapi.useInjectReducer will be removed in the next major release. \n Please update your code.'
    );

    getInjectors(context.store).injectReducer(reducerName, reducer);
  }, []);
};

export { useInjectReducer };
