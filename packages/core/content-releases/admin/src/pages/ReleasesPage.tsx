import * as React from 'react';

import {
  Box,
  Button,
  ContentLayout,
  Flex,
  HeaderLayout,
  Main,
  Tab,
  TabGroup,
  TabPanel,
  TabPanels,
  Tabs,
} from '@strapi/design-system';
import {
  CheckPermissions,
  LoadingIndicatorPage,
  PageSizeURLQuery,
  PaginationURLQuery,
  useQueryParams,
} from '@strapi/helper-plugin';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { AddReleaseDialog } from '../components/AddReleaseDialog';
import { ReleasesGrid } from '../components/ReleasesGrid';
import { PERMISSIONS } from '../constants';
import { useGetReleasesQuery } from '../modules/releaseSlice';

interface ReleasesPageQuery {
  page?: number;
  pageSize?: number;
  filters?: {
    $and?: Array<{
      releasedAt?: {
        $notNull?: boolean;
      };
    }>;
  };
}

const ReleasesPage = () => {
  const [addReleaseDialogIsShown, setAddReleaseDialogIsShown] = React.useState(false);
  const [tabSelected, setTabSelected] = React.useState<'pending' | 'done'>('pending');
  const { formatMessage } = useIntl();
  const [{ query }, setQuery] = useQueryParams<ReleasesPageQuery>();
  const response = useGetReleasesQuery(query);

  const { isLoading, isSuccess, isFetching, isError } = response;

  const toggleAddReleaseDialog = () => {
    setAddReleaseDialogIsShown((prev) => !prev);
  };

  let totalEntries = 0;

  if (isSuccess && !isFetching && response.currentData?.pagination) {
    totalEntries = response.currentData?.pagination?.total;
  }

  const handleTabChange = (index: number) => {
    if (index === 0) {
      setTabSelected('pending');
      setQuery({
        ...query,
        page: 1,
        pageSize: response?.currentData?.pagination?.pageSize || 16,
        filters: {
          $and: [
            {
              releasedAt: {
                $notNull: false,
              },
            },
          ],
        },
      });
    } else {
      setTabSelected('done');
      setQuery({
        ...query,
        page: 1,
        pageSize: response?.currentData?.pagination?.pageSize || 16,
        filters: {
          $and: [
            {
              releasedAt: {
                $notNull: true,
              },
            },
          ],
        },
      });
    }
  };

  const status = isLoading || isFetching ? 'loading' : isError ? 'error' : 'success';

  return (
    <Main aria-busy={isLoading}>
      <HeaderLayout
        title={formatMessage({
          id: 'content-releases.pages.Releases.title',
          defaultMessage: 'Releases',
        })}
        subtitle={formatMessage(
          {
            id: 'content-releases.pages.Releases.header-subtitle',
            defaultMessage: '{number, plural, =0 {No releases} one {# release} other {# releases}}',
          },
          { number: totalEntries }
        )}
        primaryAction={
          <CheckPermissions permissions={PERMISSIONS.create}>
            <Button startIcon={<Plus />} onClick={toggleAddReleaseDialog}>
              {formatMessage({
                id: 'content-releases.header.actions.add-release',
                defaultMessage: 'New release',
              })}
            </Button>
          </CheckPermissions>
        }
      />
      <ContentLayout>
        {isLoading || isFetching ? (
          <LoadingIndicatorPage />
        ) : (
          <>
            <TabGroup
              label={formatMessage({
                id: 'content-releases.pages.Releases.tab-group.label',
                defaultMessage: 'Releases list',
              })}
              variant="simple"
              initialSelectedTabIndex={['pending', 'done'].indexOf(tabSelected)}
              onTabChange={handleTabChange}
            >
              <Tabs>
                <Tab>
                  {formatMessage({
                    id: 'content-releases.pages.Releases.tab.pending',
                    defaultMessage: 'Pending',
                  })}
                </Tab>
                <Tab>
                  {formatMessage({
                    id: 'content-releases.pages.Releases.tab.done',
                    defaultMessage: 'Done',
                  })}
                </Tab>
              </Tabs>
              <TabPanels>
                {/* Pending releases */}
                <TabPanel>
                  <ReleasesGrid
                    status={status}
                    sectionTitle="pending"
                    releases={response?.currentData?.data}
                  />
                </TabPanel>
                {/* Done releases */}
                <TabPanel>
                  <ReleasesGrid
                    status={status}
                    sectionTitle="done"
                    releases={response?.currentData?.data}
                  />
                </TabPanel>
              </TabPanels>
            </TabGroup>
            {response?.currentData?.pagination && (
              <Box paddingTop={4}>
                <Flex alignItems="flex-end" justifyContent="space-between">
                  <PageSizeURLQuery
                    options={['8', '16', '32', '64']}
                    defaultValue={response.currentData.pagination.pageSize.toString()}
                  />
                  <PaginationURLQuery pagination={response?.currentData?.pagination} />
                </Flex>
              </Box>
            )}
          </>
        )}
      </ContentLayout>
      {addReleaseDialogIsShown && <AddReleaseDialog handleClose={toggleAddReleaseDialog} />}
    </Main>
  );
};

const ProtectedReleasesPage = () => (
  <CheckPermissions permissions={PERMISSIONS.main}>
    <ReleasesPage />
  </CheckPermissions>
);

export { ReleasesPage, ProtectedReleasesPage };
