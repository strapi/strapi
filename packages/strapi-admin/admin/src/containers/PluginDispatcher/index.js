/**
 *
 * PluginDispatcher
 *
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

import Helmet from 'react-helmet';
import { BlockerComponent } from 'strapi-helper-plugin';
import ErrorBoundary from '../ErrorBoundary';

export function PluginDispatcher(props) {
  const {
    global: { plugins },
    match: {
      params: { pluginId },
    },
  } = props;

  const pluginToRender = get(plugins, pluginId, null);

  if (!pluginToRender) {
    return null;
  }

  const {
    blockerComponent,
    blockerComponentProps,
    mainComponent,
    name,
    preventComponentRendering,
  } = pluginToRender;
  let PluginEntryComponent = preventComponentRendering
    ? BlockerComponent
    : mainComponent;

  // Change the plugin's blockerComponent if the plugin uses a custom one.
  if (preventComponentRendering && blockerComponent) {
    PluginEntryComponent = blockerComponent;
  }

  return (
    <div>
      <Helmet title={`Strapi - ${name}`} />
      <ErrorBoundary>
        <PluginEntryComponent {...props} {...blockerComponentProps} />
      </ErrorBoundary>
    </div>
  );
}

PluginDispatcher.defaultProps = {};

PluginDispatcher.propTypes = {
  global: PropTypes.object.isRequired,
  match: PropTypes.shape({
    params: PropTypes.shape({
      pluginId: PropTypes.string,
    }),
  }).isRequired,
};

export default memo(PluginDispatcher);
