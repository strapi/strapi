import React from 'react';
import {
  // LoadingIndicatorPage,
  // request,
  // useNotification,
  // useAutoReloadOverlayBlocker,
  // useAppInfos,
  // useTracking,
  // useStrapiApp,
  pxToRem,
  CheckPagePermissions,
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
import styled from 'styled-components';
import { Helmet } from 'react-helmet';
import { Layout, HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Flex } from '@strapi/design-system/Flex';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { LinkButton } from '@strapi/design-system/LinkButton';
import { Main } from '@strapi/design-system/Main';
import { Typography } from '@strapi/design-system/Typography';
import adminPermissions from '../../permissions';
import MarketplacePicture from '../../assets/images/marketplace-coming-soon.png';

const CenterTypography = styled(Typography)`
  text-align: center;
`;

const Img = styled.img`
  width: ${190 / 16}rem;
`;

const StackCentered = styled(Stack)`
  align-items: center;
`;

const MarketPlacePage = () => {
  const { formatMessage } = useIntl();

  return (
    <CheckPagePermissions permissions={adminPermissions.marketplace.main}>
      <Layout>
        <Main>
          <Helmet
            title={formatMessage({
              id: 'app.components.InstallPluginPage.helmet',
              defaultMessage: 'Marketplace - Plugins',
            })}
          />
          <HeaderLayout
            title={formatMessage({
              id: 'app.components.InstallPluginPage.title',
              defaultMessage: 'Marketplace',
            })}
            subtitle={formatMessage({
              id: 'app.components.InstallPluginPage.subtitle',
              defaultMessage: 'Get more out of Strapi',
            })}
          />
          <ContentLayout>
            <StackCentered
              size={0}
              hasRadius
              background="neutral0"
              shadow="tableShadow"
              paddingTop={10}
              paddingBottom={10}
            >
              <Box paddingBottom={7}>
                <Img
                  alt={formatMessage({
                    id: 'app.components.InstallPluginPage.illustration',
                    defaultMessage: 'marketplace illustration',
                  })}
                  src={MarketplacePicture}
                />
              </Box>
              <Typography variant="alpha">
                {formatMessage({
                  id: 'app.components.InstallPluginPage.coming-soon.1',
                  defaultMessage: 'A new way to make Strapi awesome.',
                })}
              </Typography>
              <Typography variant="alpha" textColor="primary700">
                {formatMessage({
                  id: 'app.components.InstallPluginPage.coming-soon.2',
                  defaultMessage: 'A new way to make Strapi awesome.',
                })}
              </Typography>
              <Flex maxWidth={pxToRem(580)} paddingTop={3}>
                <CenterTypography variant="epsilon" textColor="neutral600">
                  {formatMessage({
                    id: 'app.components.InstallPluginPage.content.subtitle',
                    defaultMessage:
                      'The new marketplace will help you get more out of Strapi. We are working hard to offer the best experience to discover and install plugins.',
                  })}
                </CenterTypography>
              </Flex>
              <Stack paddingTop={6} horizontal size={2}>
                {/* Temporarily hidden until we have the right URL for the link */}
                {/* <LinkButton href="https://strapi.io/" size="L" variant="secondary">
                  {formatMessage({
                    id: 'app.components.InstallPluginPage.submit.plugin.link',
                    defaultMessage: 'Submit your plugin',
                  })}
                </LinkButton> */}
                <LinkButton href="https://strapi.io/blog/strapi-market-is-coming-soon" size="L">
                  {formatMessage({
                    id: 'app.components.InstallPluginPage.blog.link',
                    defaultMessage: 'Read our blog post',
                  })}
                </LinkButton>
              </Stack>
            </StackCentered>
          </ContentLayout>
        </Main>
      </Layout>
    </CheckPagePermissions>
  );
};

export default MarketPlacePage;
