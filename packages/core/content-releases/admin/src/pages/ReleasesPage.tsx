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
  AnErrorOccurred,
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
      <Main aria-busy={isLoading}>
        <HeaderLayout
          title={formatMessage({
            id: 'content-releases.pages.Releases.title',
            defaultMessage: 'Releases',
          })}
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
          <LoadingIndicatorPage />
        </ContentLayout>
      </Main>
    );
  }

  const totalEntries = (isSuccess && response.currentData?.meta?.pagination?.total) || 0;

  const handleTabChange = (index: number) => {
    if (index === 0) {
      setQuery({
        ...query,
        page: 1,
        pageSize: response?.currentData?.meta?.pagination?.pageSize || 16,
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
      setQuery({
        ...query,
        page: 1,
        pageSize: response?.currentData?.meta?.pagination?.pageSize || 16,
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

  const activeTab = response?.currentData?.meta?.activeTab || 'pending';

  return (
    <Main>
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
            <Box paddingTop={4}>
              <Flex alignItems="flex-end" justifyContent="space-between">
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
            </Box>
          )}
        </>
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
