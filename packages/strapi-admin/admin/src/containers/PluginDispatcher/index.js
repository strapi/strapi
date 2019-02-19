/**
 *
 * PluginDispatcher
 *
 */
import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

import Helmet from 'react-helmet';
import BlockerComponent from 'components/BlockerComponent';
import ErrorBoundary from 'components/ErrorBoundary';

function PluginDispatcher(props) {
  const {
    global: { plugins },
    match: { params: { pluginId } },
  } = props;
  
  const pluginToRender = get(plugins, pluginId, null);

  if (!pluginToRender) {
    return null;
  }
  
  const {
    mainComponent,
    name,
    preventComponentRendering,
  } = pluginToRender;
  const blockerComponentProps = pluginToRender.blockerComponentProps;
  let Compo = preventComponentRendering ? BlockerComponent : mainComponent;

  if (preventComponentRendering && pluginToRender.blockerComponent) {
    Compo = pluginToRender.blockerComponent;
  }

  return (
    <div>
      <Helmet title={`Stapi - ${name}`} />
      <ErrorBoundary>
        <Compo {...props} {...blockerComponentProps} />
      </ErrorBoundary>
    </div>
  );
}

PluginDispatcher.defaultProps = {};
PluginDispatcher.propTypes = {
  global: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
};

export default PluginDispatcher;
