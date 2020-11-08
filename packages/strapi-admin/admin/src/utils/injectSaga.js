/* eslint-disable */
import React from 'react';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { ReactReduxContext } from 'react-redux';

import getInjectors from './sagaInjectors';

/**
 * Dynamically injects a saga, passes component's props as saga arguments
 *
 * @param {string} key A key of the saga
 * @param {function} saga A root saga that will be injected
 * @param {string} [mode] By default (constants.RESTART_ON_REMOUNT) the saga will be started on component mount and
 * cancelled with `task.cancel()` on component un-mount for improved performance. Another two options:
 *   - constants.DAEMON—starts the saga on component mount and never cancels it or starts again,
 *   - constants.ONCE_TILL_UNMOUNT—behaves like 'RESTART_ON_REMOUNT' but never runs it again.
 *
 */
export default ({ key, saga, mode, pluginId }) => WrappedComponent => {
  class InjectSaga extends React.Component {
    static WrappedComponent = WrappedComponent;
    static displayName = `withSaga(${WrappedComponent.displayName ||
      WrappedComponent.name ||
      'Component'})`;

    static contextType = ReactReduxContext;

    constructor(props, context) {
      super(props, context);

      this.injectors = getInjectors(context.store);
      const sagaName = pluginId ? `${pluginId}_${key}` : key;

      console.warn(
        'Warning: strapi.injectSaga will be removed in the next major release. \n Please update your code.'
      );

      this.injectors.injectSaga(sagaName, { saga, mode }, this.props);
    }

    componentWillUnmount() {
      const { ejectSaga } = this.injectors;
      const sagaName = pluginId ? `${pluginId}_${key}` : key;

      ejectSaga(sagaName);
    }

    injectors = getInjectors(this.context.store);

    render() {
      return <WrappedComponent {...this.props} />;
    }
  }

  return hoistNonReactStatics(InjectSaga, WrappedComponent);
};

const useInjectSaga = ({ key, saga, mode, pluginId }) => {
  const context = React.useContext(ReactReduxContext);
  const sagaName = pluginId ? `${pluginId}_${key}` : key;

  React.useEffect(() => {
    const injectors = getInjectors(context.store);
    injectors.injectSaga(sagaName, { saga, mode });

    console.warn(
      'Warning: strapi.useInjectSaga will be removed in the next major release. \n Please update your code.'
    );

    return () => {
      injectors.ejectSaga(sagaName);
    };
  }, []);
};

export { useInjectSaga };
