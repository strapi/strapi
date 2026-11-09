import * as React from 'react';

import { Layouts, Page } from '@strapi/admin/strapi-admin';
import { Alert, Link } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { MIGRATION_PATH } from '../constants';
import { useGetMigrationStatusQuery } from '../services/migration';
import { getTranslation } from '../utils/getTranslation';

/**
 * In check mode only the migration routes exist, so the other End users pages have nothing to show:
 * they show this in place of their content, and say where the check is. Outside check mode it
 * renders `children`, the page's content, which is not mounted (and asks for nothing) until the
 * mode is known. A refused status read (no `settings.read`) is not check mode.
 */
const CheckModeNotice = ({ children }: { children?: React.ReactNode }) => {
  const { formatMessage } = useIntl();
  const { data, isLoading } = useGetMigrationStatusQuery();
  const [isDismissed, setIsDismissed] = React.useState(false);

  if (isLoading) {
    return <Page.Loading />;
  }

  if (data?.mode !== 'check') {
    return <>{children}</>;
  }

  if (isDismissed) {
    return null;
  }

  return (
    <Layouts.Content>
      <Alert
        onClose={() => setIsDismissed(true)}
        variant="default"
        closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
        action={
          <Link tag={NavLink} to={MIGRATION_PATH}>
            {formatMessage({
              id: getTranslation('migration.check-mode.link'),
              defaultMessage: 'Open the migration check',
            })}
          </Link>
        }
      >
        {formatMessage({
          id: getTranslation('migration.check-mode.message'),
          defaultMessage: 'End users turns on when the migration runs',
        })}
      </Alert>
    </Layouts.Content>
  );
};

export { CheckModeNotice };
