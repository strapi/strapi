/*
 *
 * ExtendComponent
 *
 *
 */

import React from 'react';
import { get, isEmpty } from 'lodash';
import PropTypes from 'prop-types';

class ExtendComponent extends React.Component {
  getInjectedComponent = () =>
    this.context.plugins.reduce((acc, plugin) => {
      if (!isEmpty(plugin.toJS().injectedComponents)) {
        const injectedComponents = plugin
          .toJS()
          .injectedComponents.filter(
            compo =>
              compo.plugin === this.props.plugin &&
              compo.container === this.props.container &&
              compo.area === this.props.area
          );

        return injectedComponents[0];
      }

      return acc;
    }, {});

  render() {
    const Component = get(this.getInjectedComponent(), 'injectedComponent');
    const renderedComponent = Component ? <Component {...this.props} /> : '';

    return <div>{renderedComponent}</div>;
  }
}

ExtendComponent.contextTypes = {
  plugins: PropTypes.object,
  router: PropTypes.object,
  updatePlugin: PropTypes.func,
};

ExtendComponent.defaultProps = {
  children: <div />,
};

ExtendComponent.propTypes = {
  area: PropTypes.string.isRequired,
  children: PropTypes.node,
  container: PropTypes.string.isRequired,
  plugin: PropTypes.string.isRequired,
};

export default ExtendComponent;
