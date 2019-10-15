import React from 'react';
import PropTypes from 'prop-types';
import hoistNonReactStatics from 'hoist-non-react-statics';
import invariant from 'invariant';

export default ({ key, pluginId }) => WrappedComponent => {
  class WithHooks extends React.Component {
    static WrappedComponent = WrappedComponent;

    static displayName = `withHooks(${WrappedComponent.displayName ||
      WrappedComponent.name ||
      'Component'})`;

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

    getHook = hookName => {
      const self = this.compo.current;
      const { hooks } = this.state;

      if (hooks[hookName]) {
        hooks[hookName].forEach(hook => {
          hook.bind(self)();
        });
      }
    };

    setHooks = (...args) => {
      const updateState = hooks => {
        return this.setState(prevState => {
          const newHooks = Object.keys(hooks).reduce(
            (acc, current) => {
              if (acc[current]) {
                acc[current].push(hooks[current]);
              } else {
                acc[current] = [hooks[current]];
              }

              return acc;
            },
            { ...prevState.hooks },
          );

          return { hooks: newHooks };
        });
      };
      // We know that we want to inject a hook into the admin
      if (args.length === 1) {
        const [hooks] = args;

        updateState(hooks);
      }

      const [target, hooks] = args;

      if (target === `${pluginId}.${key}`) {
        updateState(hooks);
      }
    };

    prepareHooks = () => {
      const plugins = this.props.global.plugins || this.context.plugins;

      const errMsg =
        'The plugins object needs to be passed either in the context or the props to your container.\n' +
        `Please check the ${key} container in the ${pluginId} plugin\n\n`;

      invariant(plugins, errMsg);

      Object.keys(plugins)
        .filter(plugin => !!plugins[plugin].lifecycles)
        .forEach(plugin => plugins[plugin].lifecycles.bind(this)());
    };

    compo = React.createRef();

    render() {
      const props = { ...this.props, ...this.state, getHook: this.getHook };

      return <WrappedComponent ref={this.compo} {...props} />;
    }
  }

  return hoistNonReactStatics(WithHooks, WrappedComponent);
};
