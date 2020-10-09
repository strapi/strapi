import React, { memo } from 'react';
import { Header } from '@buffetjs/custom';
import { Flex, Padded, Text } from '@buffetjs/core';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import { useIntl } from 'react-intl';
import BaselineAlignement from '../../components/BaselineAlignement';
import Bloc from '../../components/Bloc';
import PageTitle from '../../components/SettingsPageTitle';
import makeSelectApp from '../App/selectors';
import { Detail, InfoText } from './components';

const makeSelectAppInfos = () => createSelector(makeSelectApp(), appState => appState.appInfos);

const ApplicationInfosPage = () => {
  const { formatMessage } = useIntl();
  const selectAppInfos = React.useMemo(makeSelectAppInfos, []);
  const appInfos = useSelector(state => selectAppInfos(state));

  const currentPlan = appInfos.communityEdition
    ? 'app.components.UpgradePlanModal.text-ce'
    : 'app.components.UpgradePlanModal.text-ee';

  const headerProps = {
    title: { label: formatMessage({ id: 'Settings.application.title' }) },
    content: formatMessage({
      id: 'Settings.application.description',
    }),
  };
  const pricingLabel = formatMessage({ id: 'Settings.application.link-pricing' });
  const upgradeLabel = formatMessage({ id: 'Settings.application.link-upgrade' });
  // TODO when notification is ready
  const shouldShowUpgradeLink = false;
  const upgradeLink = shouldShowUpgradeLink ? { label: upgradeLabel, href: '' } : null;

  return (
    <div>
      <PageTitle name="Infos" />
      <Header {...headerProps} />
      <BaselineAlignement top size="3px" />
      <Bloc>
        <Padded left right top size="smd">
          <Padded left right top size="xs">
            <Flex justifyContent="space-between">
              <Detail
                link={upgradeLink}
                title="STRAPI VERSION"
                content={`v${appInfos.strapiVersion}`}
              />
              <Detail
                link={{ label: pricingLabel, href: 'https://strapi.io/pricing' }}
                title="CURRENT PLAN"
                content={formatMessage({ id: currentPlan })}
              />
            </Flex>
            <Padded top size="lg">
              <Text fontSize="xs" color="grey" fontWeight="bold">
                NODE VERSION
              </Text>
              <InfoText content={appInfos.nodeVersion} />
            </Padded>
          </Padded>
        </Padded>
        <BaselineAlignement top size="60px" />
      </Bloc>
    </div>
  );
};

export default memo(ApplicationInfosPage);
