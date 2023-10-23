import React from 'react';

import { HeaderLayout } from '@strapi/design-system';
import { LinkButton } from '@strapi/design-system/v2';
import { useTracking } from '@strapi/helper-plugin';
import { Upload } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const PageHeader = ({ isOnline, npmPackageType }) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const tracking = npmPackageType === 'provider' ? 'didSubmitProvider' : 'didSubmitPlugin';

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
            href={`https://market.strapi.io/submit-${npmPackageType}`}
            onClick={() => trackUsage(tracking)}
            isExternal
          >
            {formatMessage({
              id: `admin.pages.MarketPlacePage.submit.${npmPackageType}.link`,
              defaultMessage: `Submit ${npmPackageType}`,
            })}
          </LinkButton>
        )
      }
    />
  );
};

export default PageHeader;

PageHeader.defaultProps = {
  npmPackageType: 'plugin',
};

PageHeader.propTypes = {
  isOnline: PropTypes.bool.isRequired,
  npmPackageType: PropTypes.string,
};
