import { Grid, Flex, Typography, SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { UID } from '@strapi/types';
import { useIntl } from 'react-intl';

import { BigNumber as BigNumberChart } from './Charts/BigNumber';
import { List as DashboardCEList } from './Charts/List';
import { AssignedEntries as DashboardAssignedEntriesList } from './Charts/Lists/AssignedEntries';
import { Pie as PieChart } from './Charts/Pie';
import { StackedArea as DashboardStackedArea } from './Charts/StackedArea';

import type { ContentTypeStatistics } from '../../../../server/src/services/statistics';

interface CollectionType {
  uid: string;
  info: {
    displayName: string;
  };
}

interface ContentTypeOverviewProps {
  collectionTypes: CollectionType[];
  uid: UID.ContentType | null;
  handleContentTypeSelect: (uid: UID.ContentType | null) => void;
  statistics: ContentTypeStatistics;
}

export const ContentTypeOverview: React.FC<ContentTypeOverviewProps> = ({
  collectionTypes,
  uid,
  handleContentTypeSelect,
  statistics,
}) => {
  const { formatMessage } = useIntl();
  const {
    count,
    statusPieChart,
    locales,
    localePieChart,
    stackedAreaChartLocales,
    topContributors,
    latestDraftEntries,
    latestPublishedEntries,
    stackedAreaChartStages,
    assignedEntriesCount,
    assignedEntriesPieChart,
    stackedAreaChartAssignedStages,
  } = statistics;

  return (
    <>
      <Typography color="neutral0" fontSize={3} fontWeight="bold">
        {formatMessage({
          id: 'app.components.HomePage.dashboard.content-type.overview.label',
          defaultMessage: 'Collection Types Overview',
        })}
      </Typography>
      <Grid.Root gap={6} marginTop={4} marginBottom={8}>
        <Grid.Item col={3} s={1}>
          <Flex
            style={{
              alignSelf: 'flex-end',
            }}
          >
            {uid && (
              // @ts-expect-error from the DS V2 this won't be needed because we're only returning strings.
              <SingleSelect size="M" onChange={handleContentTypeSelect} value={uid}>
                {collectionTypes &&
                  collectionTypes.map((collectionType) => {
                    return (
                      <SingleSelectOption key={collectionType.uid} value={collectionType.uid}>
                        {collectionType.info.displayName}
                      </SingleSelectOption>
                    );
                  })}
              </SingleSelect>
            )}
          </Flex>
        </Grid.Item>
      </Grid.Root>
      {statistics && (
        <>
          <Grid.Root gap={6} marginBottom={8}>
            <BigNumberChart number={count} text={'Entries'} />
            <PieChart data={statusPieChart} />
            <BigNumberChart number={Object.keys(locales).length} text={'Locales'} />
            <PieChart data={localePieChart} />
          </Grid.Root>

          <Grid.Root gap={6} marginBottom={8}>
            <DashboardStackedArea data={stackedAreaChartLocales} col={12} s={12} />
            <DashboardCEList
              uid={uid}
              contributors={topContributors}
              latestDraftEntries={latestDraftEntries}
              latestPublishedEntries={latestPublishedEntries}
              col={12}
              s={12}
            />
          </Grid.Root>
          {stackedAreaChartStages.length > 0 && (
            <Grid.Root gap={6} marginBottom={8}>
              <DashboardStackedArea data={stackedAreaChartStages} col={12} s={12} />
            </Grid.Root>
          )}

          {assignedEntriesCount > 0 && (
            <>
              <Typography color="neutral0" fontSize={3} fontWeight="bold">
                {formatMessage({
                  id: 'app.components.HomePage.dashboard.content-type.overview.labelfd',
                  defaultMessage: 'Assigned Entries',
                })}
              </Typography>
              <Grid.Root gap={6} marginTop={4} marginBottom={8}>
                <BigNumberChart
                  number={assignedEntriesCount}
                  col={6}
                  s={12}
                  text={'assigned entries'}
                />
                <PieChart data={assignedEntriesPieChart} col={6} s={12} />
                <DashboardStackedArea data={stackedAreaChartAssignedStages} col={6} s={12} />
                <DashboardAssignedEntriesList
                  data={assignedEntriesPieChart}
                  uid={uid}
                  col={6}
                  s={12}
                />
              </Grid.Root>
            </>
          )}
        </>
      )}
    </>
  );
};
