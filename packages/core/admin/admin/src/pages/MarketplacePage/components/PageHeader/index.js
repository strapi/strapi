import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { HeaderLayout } from '@strapi/design-system/Layout';
import { LinkButton } from '@strapi/design-system/v2/LinkButton';
import Upload from '@strapi/icons/Upload';
import { useTracking } from '@strapi/helper-plugin';

const PageHeader = ({ isOnline }) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  return (
    <HeaderLayout
      title={formatMessage({
        id: 'global.marketplace',
        defaultMessage: 'Marketplace',
      })}
      subtitle={formatMessage({
        id: 'admin.pages.MarketPlacePage.subtitle',
        defaultMessage: 'Get more out of Strapi',
      })}
      primaryAction={
        isOnline && (
          <LinkButton
            startIcon={<Upload />}
            variant="tertiary"
            href="https://market.strapi.io/submit-plugin"
            onClick={() => trackUsage('didSubmitPlugin')}
            isExternal
          >
            {formatMessage({
              id: 'admin.pages.MarketPlacePage.submit.plugin.link',
              defaultMessage: 'Submit your plugin',
            })}
          </LinkButton>
        )
      }
    />
  );
};

export default PageHeader;

PageHeader.propTypes = {
  isOnline: PropTypes.bool.isRequired,
};
