/**
 *
 * PluginDispatcher
 *
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Redirect } from 'react-router-dom';
import { get } from 'lodash';
import { ErrorBoundary } from 'react-error-boundary';
import { BlockerComponent, ErrorFallback } from '@strapi/helper-plugin';
import PageTitle from '../../components/PageTitle';

export function PluginDispatcher(props) {
  const {
    plugins,
    match: {
      params: { pluginId },
    },
  } = props;

  const pluginToRender = get(plugins, pluginId, null);

  if (!pluginToRender) {
    return <Redirect to="/404" />;
  }

  const {
    blockerComponent,
    blockerComponentProps,
    mainComponent,
    name,
    preventComponentRendering,
  } = pluginToRender;
  let PluginEntryComponent = preventComponentRendering ? BlockerComponent : mainComponent;

  // Change the plugin's blockerComponent if the plugin uses a custom one.
  if (preventComponentRendering && blockerComponent) {
    PluginEntryComponent = blockerComponent;
  }

  return (
    <div>
      <PageTitle title={`Strapi - ${name}`} />
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <PluginEntryComponent {...props} {...blockerComponentProps} />
      </ErrorBoundary>
    </div>
  );
}

PluginDispatcher.defaultProps = {};

PluginDispatcher.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      pluginId: PropTypes.string,
    }),
  }).isRequired,
  plugins: PropTypes.object.isRequired,
};

export default memo(PluginDispatcher);
