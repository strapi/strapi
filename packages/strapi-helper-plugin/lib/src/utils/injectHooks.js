import React from 'react';
import PropTypes from 'prop-types';
import hoistNonReactStatics from 'hoist-non-react-statics';
import invariant from 'invariant';

export default ({ key, pluginId }) => WrappedComponent => {
  class WithHooks extends React.Component {
    static WrappedComponent = WrappedComponent;

    static displayName = `withHooks(${(WrappedComponent.displayName || WrappedComponent.name || 'Component')})`;

    static contextTypes = {
      plugins: PropTypes.object,
    };

    static propTypes = {
      global: PropTypes.object,
    };

    static defaultProps = {
      global: {},
    };

    state = { hooks: {}, otherComponents: [] };

    componentDidMount() {
      this.prepareHooks();
    }

    getHook = (hookName) => {
      const that = this.compo.current;

      if (this.state.hooks[hookName]) {      
        this.state.hooks[hookName].bind(that)();
      }
    }

    setHooks = (...args) => {
      // We know that we want to inject a hook into the admin

      if (args.length === 1) {
        const [hooks] = args;

        return this.setState(prevState => ({ hooks: {...prevState.hooks, ...hooks } }));
      }

      const [target, hooks] = args;
      
      if (target === `${pluginId}.${key}`) {
        return this.setState(prevState => ({ hooks: {...prevState.hooks, ...hooks } }));
      }
    }

    prepareHooks = () => {
      let plugins;

      try {
        plugins = this.props.global.plugins;
      } catch(err) {
        plugins = this.context.plugins;
      }
      
      const errMsg = 'The plugins object needs to be passed either in the context or the props to your container.\n'
        + `Please check the ${key} container in the ${pluginId} plugin\n\n`;

      invariant(plugins, errMsg);

      const pluginsLifecycles = Object.keys(plugins).reduce((acc, current) => {
        const lifecycles = plugins[current].lifecycles;

        if (lifecycles) {
          acc.push(lifecycles);
        }

        return acc;
      }, []);

      pluginsLifecycles.forEach(lifecycles => {
        lifecycles.bind(this)();
      });
    }

    compo = React.createRef();

    render() {
      const props = {...this.props, ...this.state, getHook: this.getHook };

      return <WrappedComponent ref={this.compo} {...props} />;
    }
  }

  return hoistNonReactStatics(WithHooks, WrappedComponent);
};
