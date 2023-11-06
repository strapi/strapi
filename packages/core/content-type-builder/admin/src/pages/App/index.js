/**
 *
 * App
 *
 */

import React, { lazy, Suspense, useEffect, useRef } from 'react';

import { Layout } from '@strapi/design-system';
import { CheckPagePermissions, LoadingIndicatorPage, useGuidedTour } from '@strapi/helper-plugin';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { Route, Switch } from 'react-router-dom';

import ContentTypeBuilderNav from '../../components/ContentTypeBuilderNav';
import DataManagerProvider from '../../components/DataManagerProvider';
import FormModalNavigationProvider from '../../components/FormModalNavigationProvider';
import { PERMISSIONS } from '../../constants';
import pluginId from '../../pluginId';
import RecursivePath from '../RecursivePath';

const ListView = lazy(() => import('../ListView'));

const App = () => {
  const { formatMessage } = useIntl();
  const title = formatMessage({
    id: `${pluginId}.plugin.name`,
    defaultMessage: 'Content Types Builder',
  });
  const { startSection } = useGuidedTour();
  const startSectionRef = useRef(startSection);

  useEffect(() => {
    if (startSectionRef.current) {
      startSectionRef.current('contentTypeBuilder');
    }
  }, []);

  return (
    <CheckPagePermissions permissions={PERMISSIONS.main}>
      <Helmet title={title} />
      <FormModalNavigationProvider>
        <DataManagerProvider>
          <Layout sideNav={<ContentTypeBuilderNav />}>
            <Suspense fallback={<LoadingIndicatorPage />}>
              <Switch>
                <Route
                  path={`/plugins/${pluginId}/content-types/create-content-type`}
                  component={ListView}
                />
                <Route path={`/plugins/${pluginId}/content-types/:uid`} component={ListView} />
                <Route
                  path={`/plugins/${pluginId}/component-categories/:categoryUid`}
                  component={RecursivePath}
                />
              </Switch>
            </Suspense>
          </Layout>
        </DataManagerProvider>
      </FormModalNavigationProvider>
    </CheckPagePermissions>
  );
};

export default App;
