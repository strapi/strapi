// import React from 'react';
// import {
//   request,
//   useNotification,
//   useAutoReloadOverlayBlocker,
//   useStrapiApp,
// } from '@strapi/helper-plugin';
// import { Header, List } from '@buffetjs/custom';
// import { useIntl } from 'react-intl';
// import { Helmet } from 'react-helmet';
// import ContainerFluid from '../../components/ContainerFluid';
// import ListWrapper from './ListWrapper';
// import Row from './Row';
// import generateRows from './utils/generateRows';

// const InstalledPluginsPage = () => {
//   const toggleNotification = useNotification();
//   const { lockAppWithAutoreload, unlockAppWithAutoreload } = useAutoReloadOverlayBlocker();
//   const { formatMessage } = useIntl();
//   const { plugins } = useStrapiApp();
//   const onConfirm = async id => {
//     try {
//       const requestUrl = `/admin/plugins/uninstall/${id}`;
//       // Force the Overlayblocker to be displayed
//       const overlayblockerParams = {
//         enabled: true,
//         title: 'app.components.ListPluginsPage.deletePlugin.title',
//         description: 'app.components.ListPluginsPage.deletePlugin.description',
//       };
//       // Lock the app
//       lockAppWithAutoreload(overlayblockerParams);
//       const response = await request(requestUrl, { method: 'DELETE' }, overlayblockerParams);

//       if (response.ok) {
//         // Reload the app
//         window.location.reload();
//       }
//     } catch (err) {
//       unlockAppWithAutoreload();
//       toggleNotification({
//         type: 'warning',
//         message: { id: 'app.components.listPluginsPage.deletePlugin.error' },
//       });
//     }
//   };

//   const rows = generateRows(plugins, onConfirm);

//   return (
//     <div>
//       <Helmet
//         title={formatMessage({
//           id: 'app.components.ListPluginsPage.helmet.title',
//         })}
//       />
//       <ContainerFluid>
//         <Header
//           title={{
//             label: formatMessage({
//               id: 'app.components.ListPluginsPage.title',
//             }),
//           }}
//           content={formatMessage({
//             id: 'app.components.ListPluginsPage.description',
//           })}
//         />
//         <ListWrapper>
//           <List
//             title={formatMessage(
//               { id: 'app.components.listPlugins.title.plural' },
//               { number: rows.length }
//             )}
//             items={rows}
//             customRowComponent={Row}
//           />
//         </ListWrapper>
//       </ContainerFluid>
//     </div>
//   );
// };

// export default InstalledPluginsPage;

import React from 'react';
import { CheckPagePermissions, NoContent } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { Layout, HeaderLayout, ContentLayout } from '@strapi/parts/Layout';
import { Main } from '@strapi/parts/Main';
import adminPermissions from '../../permissions';

const InstalledPluginsPage = () => {
  const { formatMessage } = useIntl();

  return (
    <CheckPagePermissions permissions={adminPermissions.marketplace.main}>
      <Layout>
        <Main>
          <HeaderLayout
            title={formatMessage({
              id: 'app.components.ListPluginsPage.helmet.title',
              defaultMessage: 'List plugins',
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

export default InstalledPluginsPage;
