// import React from 'react';
// import { Header } from '@buffetjs/custom';
// import { Flex, Padded, Text } from '@buffetjs/core';
// import { useIntl } from 'react-intl';
// import { BaselineAlignment, useAppInfos } from '@strapi/helper-plugin';
// import Bloc from '../../components/Bloc';
// import PageTitle from '../../components/SettingsPageTitle';
// import { Detail, InfoText } from './components';

// const ApplicationInfosPage = () => {
//   const appInfos = useAppInfos();
//   const { shouldUpdateStrapi, latestStrapiReleaseTag } = appInfos;
//   const { formatMessage } = useIntl();

//   const currentPlan = appInfos.communityEdition
//     ? 'app.components.UpgradePlanModal.text-ce'
//     : 'app.components.UpgradePlanModal.text-ee';

//   const headerProps = {
//     title: { label: formatMessage({ id: 'Settings.application.title' }) },
//     content: formatMessage({
//       id: 'Settings.application.description',
//     }),
//   };
//   const pricingLabel = formatMessage({ id: 'Settings.application.link-pricing' });
//   const upgradeLabel = formatMessage({ id: 'Settings.application.link-upgrade' });
//   const strapiVersion = formatMessage({ id: 'Settings.application.strapi-version' });
//   const nodeVersion = formatMessage({ id: 'Settings.application.node-version' });
//   const editionTitle = formatMessage({ id: 'Settings.application.edition-title' });

//   /* eslint-disable indent */
//   const upgradeLink = shouldUpdateStrapi
//     ? {
//         label: upgradeLabel,
//         href: `https://github.com/strapi/strapi/releases/tag/${latestStrapiReleaseTag}`,
//       }
//     : null;
//   /* eslint-enable indent */

//   return (
//     <div>
//       <PageTitle name="Application" />
//       <Header {...headerProps} />
//       <BaselineAlignment top size="3px" />
//       <Bloc>
//         <Padded left right top size="smd">
//           <Padded left right top size="xs">
//             <Flex justifyContent="space-between">
//               <Detail
//                 link={upgradeLink}
//                 title={strapiVersion}
//                 content={`v${appInfos.strapiVersion}`}
//               />
//               <Detail
//                 link={{ label: pricingLabel, href: 'https://strapi.io/pricing' }}
//                 title={editionTitle}
//                 content={formatMessage({ id: currentPlan })}
//               />
//             </Flex>
//             <Padded top size="lg">
//               <Text fontSize="xs" color="grey" fontWeight="bold">
//                 {nodeVersion}
//               </Text>
//               <InfoText content={appInfos.nodeVersion} />
//             </Padded>
//           </Padded>
//         </Padded>
//         <BaselineAlignment top size="60px" />
//       </Bloc>
//     </div>
//   );
// };

// export default ApplicationInfosPage;
export default () => 'ApplicationInfosPage';
