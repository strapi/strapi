/**
 *
 * App
 *
 */

import React, { Suspense, lazy } from 'react';
import { Switch, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { LoadingIndicatorPage, CheckPagePermissions } from '@strapi/helper-plugin';
import { Layout } from '@strapi/design-system/Layout';
import pluginPermissions from '../../permissions';
import pluginId from '../../pluginId';
import DataManagerProvider from '../../components/DataManagerProvider';
import FormModalNavigationProvider from '../../components/FormModalNavigationProvider';
import RecursivePath from '../RecursivePath';
import icons from './utils/icons.json';
import ContentTypeBuilderNav from '../../components/ContentTypeBuilderNav';

const ListView = lazy(() => import('../ListView'));

const App = () => {
  const { formatMessage } = useIntl();
  const title = formatMessage({
    id: `${pluginId}.plugin.name`,
    defaultMessage: 'Content Types Builder',
  });

  return (
    <CheckPagePermissions permissions={pluginPermissions.main}>
      <Helmet title={title} />
      <FormModalNavigationProvider>
        <DataManagerProvider allIcons={icons}>
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
