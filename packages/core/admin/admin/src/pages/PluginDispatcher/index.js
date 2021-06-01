/**
 *
 * PluginDispatcher
 *
 */

import React, { memo } from 'react';
import { Redirect, useParams } from 'react-router-dom';
import get from 'lodash/get';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback, useStrapiApp } from '@strapi/helper-plugin';
import PageTitle from '../../components/PageTitle';

const PluginDispatcher = () => {
  const { pluginId } = useParams();
  const { plugins } = useStrapiApp();

  const pluginToRender = get(plugins, pluginId, null);

  if (!pluginToRender) {
    return <Redirect to="/404" />;
  }

  const { mainComponent, name } = pluginToRender;
  const PluginEntryComponent = mainComponent;

  return (
    <div>
      <PageTitle title={`Strapi - ${name}`} />
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <PluginEntryComponent />
      </ErrorBoundary>
    </div>
  );
};

export default memo(PluginDispatcher);
export { PluginDispatcher };
