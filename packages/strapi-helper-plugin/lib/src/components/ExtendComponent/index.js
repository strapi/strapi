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
  getInjectedComponent = () => {
    const injectedComponent = this.context.plugins.reduce((acc, plugin) => {

      if (!isEmpty(plugin.toJS().injectedComponents)) {
        const injectedComponents = plugin.toJS().injectedComponents.filter((compo) => {

          if (compo.plugin === this.props.plugin && compo.container === this.props.container && compo.area === this.props.area) {
            return compo;
          }
        });

        return injectedComponents[0];
      }

      return acc;
    }, {});

    return injectedComponent;
  }

  render() {
    const Component = get(this.getInjectedComponent(), 'injectedComponent');
    const renderedComponent = Component ? <Component {...this.props} /> : '';

    return (
      <div>
        {renderedComponent}
      </div>
    );
  }
}

ExtendComponent.contextTypes = {
  plugins: PropTypes.object,
  router: PropTypes.object,
  updatePlugin: PropTypes.func,
}

ExtendComponent.propTypes = {
  area: PropTypes.string.isRequired,
  container: PropTypes.string.isRequired,
  children: PropTypes.node,
  plugin: PropTypes.string.isRequired,
};

ExtendComponent.defaultProps = {
  children: <div />,
};

export default ExtendComponent;
