/* eslint-disable import/no-default-export */
/* eslint-disable check-file/filename-naming-convention  */
/* eslint-disable check-file/no-index */
import { lazy, Suspense, useEffect, useRef } from 'react';

import { Page, useGuidedTour, Layouts, useAppInfo } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { Route, Routes } from 'react-router-dom';

import { AutoReloadOverlayBlockerProvider } from '../../components/AutoReloadOverlayBlocker';
import { ContentTypeBuilderNav } from '../../components/ContentTypeBuilderNav/ContentTypeBuilderNav';
import DataManagerProvider from '../../components/DataManager/DataManagerProvider';
import { FormModal } from '../../components/FormModal/FormModal';
import { FormModalNavigationProvider } from '../../components/FormModalNavigation/FormModalNavigationProvider';
import { PERMISSIONS } from '../../constants';
import { pluginId } from '../../pluginId';
import { EmptyState } from '../ListView/EmptyState';

const ListView = lazy(() => import('../ListView/ListView'));

const App = () => {
  const { formatMessage } = useIntl();
  const title = formatMessage({
    id: `${pluginId}.plugin.name`,
    defaultMessage: 'Content Types Builder',
  });
  const startSection = useGuidedTour('App', (state) => state.startSection);
  const autoReload = useAppInfo('DataManagerProvider', (state) => state.autoReload);
  const startSectionRef = useRef(startSection);

  useEffect(() => {
    if (startSectionRef.current) {
      startSectionRef.current('contentTypeBuilder');
    }
  }, []);

  return (
    <Page.Protect permissions={PERMISSIONS.main}>
      <Page.Title>{title}</Page.Title>
      <AutoReloadOverlayBlockerProvider>
        <FormModalNavigationProvider>
          <DataManagerProvider>
            <>
              {autoReload && <FormModal />}
              <Layouts.Root sideNav={<ContentTypeBuilderNav />}>
                <Suspense fallback={<Page.Loading />}>
                  <Routes>
                    <Route path="content-types/create-content-type" element={<EmptyState />} />
                    <Route path="content-types/:contentTypeUid" element={<ListView />} />
                    <Route
                      path={`component-categories/:categoryUid/:componentUid`}
                      element={<ListView />}
                    />
                  </Routes>
                </Suspense>
              </Layouts.Root>
            </>
          </DataManagerProvider>
        </FormModalNavigationProvider>
      </AutoReloadOverlayBlockerProvider>
    </Page.Protect>
  );
};

export default App;
