/* eslint-disable import/no-default-export */
/* eslint-disable check-file/filename-naming-convention  */
/* eslint-disable check-file/no-index */
import { lazy, Suspense, useEffect, useRef } from 'react';

import { Page, useGuidedTour, Layouts } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { Route, Routes } from 'react-router-dom';

import { AutoReloadOverlayBlockerProvider } from '../../components/AutoReloadOverlayBlocker';
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
  const startSection = useGuidedTour('App', (state) => state.startSection);
  const startSectionRef = useRef(startSection);

  useEffect(() => {
    if (startSectionRef.current) {
      startSectionRef.current('contentTypeBuilder');
    }
  }, []);

  // FIXME Error here
  return (
    <Page.Protect permissions={PERMISSIONS.main}>
      <Page.Title>{title}</Page.Title>
      <AutoReloadOverlayBlockerProvider>
        <FormModalNavigationProvider>
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore */}
          <DataManagerProvider>
            <Layouts.Root sideNav={<ContentTypeBuilderNav />}>
              <Suspense fallback={<Page.Loading />}>
                <Routes>
                  <Route path="content-types/:uid" element={<ListView />} />
                  <Route path={`component-categories/:categoryUid/*`} element={<RecursivePath />} />
                </Routes>
              </Suspense>
            </Layouts.Root>
          </DataManagerProvider>
        </FormModalNavigationProvider>
      </AutoReloadOverlayBlockerProvider>
    </Page.Protect>
  );
};

export default App;
