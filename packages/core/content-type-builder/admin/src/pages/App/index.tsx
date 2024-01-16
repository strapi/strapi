/* eslint-disable import/no-default-export */
/* eslint-disable check-file/filename-naming-convention  */
/* eslint-disable check-file/no-index */
import { lazy, Suspense, useEffect, useRef } from 'react';

import { Layout } from '@strapi/design-system';
import { CheckPagePermissions, LoadingIndicatorPage, useGuidedTour } from '@strapi/helper-plugin';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { Route, Routes } from 'react-router-dom';

import { ContentTypeBuilderNav } from '../../components/ContentTypeBuilderNav/ContentTypeBuilderNav';
import DataManagerProvider from '../../components/DataManagerProvider/DataManagerProvider';
import { FormModalNavigationProvider } from '../../components/FormModalNavigationProvider/FormModalNavigationProvider';
import { PERMISSIONS } from '../../constants';
import { pluginId } from '../../pluginId';
import { RecursivePath } from '../RecursivePath/RecursivePath';

const ListView = lazy(() => import('../ListView/ListView'));

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
        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
        {/* @ts-ignore */}
        <DataManagerProvider>
          <Layout sideNav={<ContentTypeBuilderNav />}>
            <Suspense fallback={<LoadingIndicatorPage />}>
              <Routes>
                <Route path="content-types/:uid" element={<ListView />} />
                <Route path={`component-categories/:categoryUid/*`} element={<RecursivePath />} />
              </Routes>
            </Suspense>
          </Layout>
        </DataManagerProvider>
      </FormModalNavigationProvider>
    </CheckPagePermissions>
  );
};

export default App;
