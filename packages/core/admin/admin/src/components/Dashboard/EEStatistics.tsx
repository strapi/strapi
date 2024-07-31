import { Grid, Typography } from '@strapi/design-system';
import { formatDistanceToNow } from 'date-fns';
import { useIntl } from 'react-intl';

import { BigNumber as BigNumberChart } from './Charts/BigNumber';
import { Audit as DashboardAudit } from './Charts/Lists/Audit';

import type {
  EEStatistics as EEStatisticsType,
  Release,
  Activity,
} from '../../../../server/src/services/statistics';

interface EEStatisticsProps {
  statistics: EEStatisticsType;
}

export const EEStatistics: React.FC<EEStatisticsProps> = ({ statistics }) => {
  const { formatMessage } = useIntl();

  const { upcomingReleases, upcomingReleasesCount, latestActivities, workflowsCount } = statistics;

  if (
    !upcomingReleases.length &&
    !latestActivities.length &&
    !workflowsCount &&
    !upcomingReleasesCount
  )
    return;
  return (
    <>
      <Typography color="neutral0" fontSize={3} fontWeight="bold">
        {formatMessage({
          id: 'app.components.HomePage.dashboard.content-type.overview.labelfd',
          defaultMessage: 'Advanced features',
        })}
      </Typography>
      <Grid.Root gap={6} marginTop={4} marginBottom={8}>
        {upcomingReleasesCount && (
          <BigNumberChart
            col={6}
            s={12}
            number={upcomingReleasesCount}
            text={'Upcoming Release(s)'}
          />
        )}
        {upcomingReleasesCount > 0 && (
          <BigNumberChart
            col={6}
            s={12}
            number={parseInt(
              formatDistanceToNow(new Date((upcomingReleases[0] as Release).scheduledAt))
            )}
            text={'day(s) before next release'}
          />
        )}
        {latestActivities && (
          <DashboardAudit col={12} s={12} latestActivities={latestActivities as Activity[]} />
        )}
      </Grid.Root>
    </>
  );
};
