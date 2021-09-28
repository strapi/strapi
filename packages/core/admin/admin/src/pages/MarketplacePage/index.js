import React from 'react';
import {
  // LoadingIndicatorPage,
  // request,
  // useNotification,
  // useAutoReloadOverlayBlocker,
  // useAppInfos,
  // useTracking,
  // useStrapiApp,
  CheckPagePermissions,
  NoContent,
} from '@strapi/helper-plugin';
// import { Header } from '@buffetjs/custom';
// import { useIntl } from 'react-intl';
// import { useHistory } from 'react-router-dom';
// import { useFetchPluginsFromMarketPlace } from '../../hooks';
// import { Helmet } from 'react-helmet';
// import PluginCard from './PluginCard';
// import Wrapper from './Wrapper';
// import MarketplaceBanner from './MarketplaceBanner';

// const MarketPlacePage = () => {
//   const toggleNotification = useNotification();
//   const { lockAppWithAutoreload, unlockAppWithAutoreload } = useAutoReloadOverlayBlocker();
//   const history = useHistory();
//   const { trackUsage } = useTracking();
//   const { autoReload, currentEnvironment } = useAppInfos();
//   const { formatMessage } = useIntl();
//   const { plugins } = useStrapiApp();

//   const { error, isLoading, data } = useFetchPluginsFromMarketPlace();

//   const emitEventRef = useRef(trackUsage);

//   useEffect(() => {
//     emitEventRef.current('didGoToMarketplace');
//   }, []);

//   if (isLoading || error) {
//     return <LoadingIndicatorPage />;
//   }

//   const handleDownloadPlugin = async pluginId => {
//     trackUsage('willInstallPlugin', { plugin: pluginId });
//     // Force the Overlayblocker to be displayed
//     const overlayblockerParams = {
//       enabled: true,
//       title: 'app.components.InstallPluginPage.Download.title',
//       description: 'app.components.InstallPluginPage.Download.description',
//     };
//     // Lock the app
//     lockAppWithAutoreload(overlayblockerParams);

//     try {
//       const opts = {
//         method: 'POST',
//         body: {
//           plugin: pluginId,
//           port: window.location.port,
//         },
//       };
//       const response = await request('/admin/plugins/install', opts, overlayblockerParams);

//       if (response.ok) {
//         trackUsage('didInstallPlugin', { plugin: pluginId });
//         // Reload the app
//         window.location.reload();
//       }
//     } catch (err) {
//       unlockAppWithAutoreload();
//       toggleNotification({
//         type: 'warning',
//         message: { id: 'notification.error' },
//       });
//     }
//   };

//   return (
//     <div>
//       <Helmet
//         title={formatMessage({
//           id: 'app.components.InstallPluginPage.helmet',
//         })}
//       />
//       <Wrapper>
//         <Header
//           title={{
//             label: formatMessage({
//               id: 'app.components.InstallPluginPage.title',
//             }),
//           }}
//           content={formatMessage({
//             id: 'app.components.InstallPluginPage.description',
//           })}
//         />
//         <MarketplaceBanner />
//         <div className="row" style={{ paddingTop: '4.1rem' }}>
//           {data.map(plugin => {
//             return (
//               <PluginCard
//                 autoReload={autoReload}
//                 currentEnvironment={currentEnvironment}
//                 downloadPlugin={handleDownloadPlugin}
//                 key={plugin.id}
//                 history={history}
//                 plugin={plugin}
//                 showSupportUsButton={false}
//                 isAlreadyInstalled={plugins[plugin.id] !== undefined}
//               />
//             );
//           })}
//         </div>
//       </Wrapper>
//     </div>
//   );
// };

import { useIntl } from 'react-intl';
import { Layout, HeaderLayout, ContentLayout } from '@strapi/parts/Layout';
import { Main } from '@strapi/parts/Main';
import adminPermissions from '../../permissions';

const MarketPlacePage = () => {
  const { formatMessage } = useIntl();

  return (
    <CheckPagePermissions permissions={adminPermissions.marketplace.main}>
      <Layout>
        <Main>
          <HeaderLayout
            title={formatMessage({
              id: 'app.components.InstallPluginPage.helmet',
              defaultMessage: 'Marketplace - Plugins',
            })}
          />
          <ContentLayout>
            <NoContent
              content={{
                id: 'coming.soon',
                defaultMessage:
                  'This content is currently under construction and will be back in a few weeks!',
              }}
            />
          </ContentLayout>
        </Main>
      </Layout>
    </CheckPagePermissions>
  );
};

export default MarketPlacePage;
