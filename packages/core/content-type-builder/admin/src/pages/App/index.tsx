/* eslint-disable import/no-default-export */
/* eslint-disable check-file/filename-naming-convention  */
/* eslint-disable check-file/no-index */
import { lazy, Suspense, useEffect } from 'react';

import { Page, Layouts, useAppInfo, useGuidedTour } from '@strapi/admin/strapi-admin';
import { useAIAvailability } from '@strapi/admin/strapi-admin/ee';
import { useIntl } from 'react-intl';
import { Route, Routes } from 'react-router-dom';

import { Chat } from '../../components/AIChat/Chat';
import { prefetchAIToken } from '../../components/AIChat/lib/aiClient';
import { ChatProvider } from '../../components/AIChat/providers/ChatProvider';
import { AutoReloadOverlayBlockerProvider } from '../../components/AutoReloadOverlayBlocker';
import { ContentTypeBuilderNav } from '../../components/ContentTypeBuilderNav/ContentTypeBuilderNav';
import { CTBSessionProvider } from '../../components/CTBSession/CTBSessionProvider';
import DataManagerProvider from '../../components/DataManager/DataManagerProvider';
import { ExitPrompt } from '../../components/ExitPrompt';
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

  const autoReload = useAppInfo('DataManagerProvider', (state) => state.autoReload);
  const isAIEnabled = useAIAvailability();
  const state = useGuidedTour('ContentTypeBuilderApp', (s) => s.state);
  const dispatch = useGuidedTour('ContentTypeBuilderApp', (s) => s.dispatch);

  // Prefetch AI token on initial load
  useEffect(() => {
    prefetchAIToken();
  }, []);

  // Set tour type based on AI availability when the app loads
  useEffect(() => {
    const tourType = isAIEnabled ? 'ContentTypeBuilderAI' : 'ContentTypeBuilderNoAI';
    const currentTourType = state.tours.contentTypeBuilder.tourType;

    if (currentTourType !== tourType) {
      dispatch({
        type: 'set_tour_type',
        payload: { tourName: 'contentTypeBuilder', tourType },
      });
    }
  }, [isAIEnabled, state.tours.contentTypeBuilder.tourType, dispatch]);

  return (
    <Page.Protect permissions={PERMISSIONS.main}>
      <Page.Title>{title}</Page.Title>
      <AutoReloadOverlayBlockerProvider>
        <CTBSessionProvider>
          <FormModalNavigationProvider>
            <DataManagerProvider>
              <ExitPrompt />
              <ChatProvider>
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
                        <Route path="*" element={<ListView />} />
                      </Routes>
                    </Suspense>
                  </Layouts.Root>
                  <Chat />
                </>
              </ChatProvider>
            </DataManagerProvider>
          </FormModalNavigationProvider>
        </CTBSessionProvider>
      </AutoReloadOverlayBlockerProvider>
    </Page.Protect>
  );
};

export default App;
