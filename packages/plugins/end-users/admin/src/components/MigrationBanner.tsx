import { Alert, Box, Link } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { MIGRATION_PATH } from '../constants';
import { useGetMigrationStatusQuery } from '../services/migration';
import { getTranslation } from '../utils/getTranslation';

/**
 * Counts the migration items that still need an answer, at the top of every End users page. It is
 * silent with no record (the migration has not run), with nothing unresolved, and when the read is
 * refused (an administrator without `settings.read`).
 */
const MigrationBanner = () => {
  const { formatMessage } = useIntl();
  const { data } = useGetMigrationStatusQuery();

  if (!data?.record || data.unresolved === 0) {
    return null;
  }

  return (
    <Box paddingLeft={10} paddingRight={10} paddingTop={6}>
      <Alert
        variant="warning"
        closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
        action={
          <Link tag={NavLink} to={MIGRATION_PATH}>
            {formatMessage({
              id: getTranslation('migration.banner.link'),
              defaultMessage: 'Open the migration report',
            })}
          </Link>
        }
      >
        {formatMessage(
          {
            id: getTranslation('migration.banner.message'),
            defaultMessage:
              '{count, plural, one {# migration item needs attention} other {# migration items need attention}}',
          },
          { count: data.unresolved }
        )}
      </Alert>
    </Box>
  );
};

export { MigrationBanner };
