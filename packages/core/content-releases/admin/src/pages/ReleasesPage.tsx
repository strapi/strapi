import * as React from 'react';

import {
  Box,
  ContentLayout,
  Flex,
  Tab,
  TabGroup,
  TabPanel,
  TabPanels,
  Tabs,
} from '@strapi/design-system';
import {
  AnErrorOccurred,
  CheckPermissions,
  LoadingIndicatorPage,
  PageSizeURLQuery,
  PaginationURLQuery,
  useQueryParams,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { AddReleaseDialog } from '../components/AddReleaseDialog';
import { ReleasesGrid } from '../components/ReleasesGrid';
import { ReleasesLayout } from '../components/ReleasesLayout';
import { PERMISSIONS } from '../constants';
import { useGetReleasesQuery, GetAllReleasesQueryParams } from '../services/release';

const ReleasesPage = () => {
  const [addReleaseDialogIsShown, setAddReleaseDialogIsShown] = React.useState(false);
  const { formatMessage } = useIntl();
  const [{ query }, setQuery] = useQueryParams<GetAllReleasesQueryParams>();
  const response = useGetReleasesQuery(query);

  const { isLoading, isSuccess, isError } = response;

  const toggleAddReleaseDialog = () => {
    setAddReleaseDialogIsShown((prev) => !prev);
  };

  if (isLoading) {
    return (
      <ReleasesLayout onClickAddRelease={toggleAddReleaseDialog} isLoading>
        <ContentLayout>
          <LoadingIndicatorPage />
        </ContentLayout>
      </ReleasesLayout>
    );
  }

  const totalEntries = (isSuccess && response.currentData?.meta?.pagination?.total) || 0;

  const handleTabChange = (index: number) => {
    setQuery({
      ...query,
      page: 1,
      pageSize: response?.currentData?.meta?.pagination?.pageSize || 16,
      filters: {
        $and: [
          {
            releasedAt: {
              $notNull: index === 0 ? false : true,
            },
          },
        ],
      },
    });
  };

  const activeTab = response?.currentData?.meta?.activeTab || 'pending';

  return (
    <ReleasesLayout onClickAddRelease={toggleAddReleaseDialog} totalEntries={totalEntries}>
      <ContentLayout>
        <>
          <TabGroup
            label={formatMessage({
              id: 'content-releases.pages.Releases.tab-group.label',
              defaultMessage: 'Releases list',
            })}
            variant="simple"
            initialSelectedTabIndex={['pending', 'done'].indexOf(activeTab)}
            onTabChange={handleTabChange}
          >
            <Box paddingBottom={9}>
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
            </Box>

            <TabPanels>
              {/* Pending releases */}
              <TabPanel>
                {isError ? (
                  <Flex paddingTop={8}>
                    <AnErrorOccurred />
                  </Flex>
                ) : (
                  <ReleasesGrid sectionTitle="pending" releases={response?.currentData?.data} />
                )}
              </TabPanel>
              {/* Done releases */}
              <TabPanel>
                {isError ? (
                  <Flex paddingTop={8}>
                    <AnErrorOccurred />
                  </Flex>
                ) : (
                  <ReleasesGrid sectionTitle="done" releases={response?.currentData?.data} />
                )}
              </TabPanel>
            </TabPanels>
          </TabGroup>
          {totalEntries > 0 && (
            <Flex paddingTop={4} alignItems="flex-end" justifyContent="space-between">
              <PageSizeURLQuery
                options={['8', '16', '32', '64']}
                defaultValue={response?.currentData?.meta?.pagination?.pageSize.toString()}
              />
              <PaginationURLQuery
                pagination={{
                  pageCount: response?.currentData?.meta?.pagination?.pageCount || 0,
                }}
              />
            </Flex>
          )}
        </>
      </ContentLayout>
      {addReleaseDialogIsShown && <AddReleaseDialog handleClose={toggleAddReleaseDialog} />}
    </ReleasesLayout>
  );
};

const ProtectedReleasesPage = () => (
  <CheckPermissions permissions={PERMISSIONS.main}>
    <ReleasesPage />
  </CheckPermissions>
);

export { ReleasesPage, ProtectedReleasesPage };
