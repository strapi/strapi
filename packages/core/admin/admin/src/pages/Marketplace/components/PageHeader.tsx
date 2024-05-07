import { LinkButton } from '@strapi/design-system';
import { Upload } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { Layouts } from '../../../components/Layouts/Layout';
import { useTracking } from '../../../features/Tracking';

import type { NpmPackageType } from '../MarketplacePage';

interface PageHeaderProps {
  isOnline?: boolean;
  npmPackageType?: NpmPackageType;
}

const PageHeader = ({ isOnline, npmPackageType = 'plugin' }: PageHeaderProps) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const tracking = npmPackageType === 'provider' ? 'didSubmitProvider' : 'didSubmitPlugin';

  return (
    <Layouts.Header
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

export { PageHeader };
export type { PageHeaderProps };
