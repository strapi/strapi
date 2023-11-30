import * as React from 'react';

import {
  Box,
  Button,
  ContentLayout,
  EmptyStateLayout,
  Flex,
  Grid,
  GridItem,
  HeaderLayout,
  Main,
  Tab,
  TabGroup,
  TabPanel,
  TabPanels,
  Tabs,
  Typography,
} from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import {
  AnErrorOccurred,
  CheckPermissions,
  LoadingIndicatorPage,
  PageSizeURLQuery,
  PaginationURLQuery,
  useQueryParams,
} from '@strapi/helper-plugin';
import { EmptyDocuments, Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { GetReleases } from '../../../shared/contracts/releases';
import { AddReleaseDialog } from '../components/AddReleaseDialog';
import { PERMISSIONS } from '../constants';
import { useGetReleasesQuery, GetAllReleasesQueryParams } from '../services/release';

/* -------------------------------------------------------------------------------------------------
 * ReleasesLayout
 * -----------------------------------------------------------------------------------------------*/
interface ReleasesLayoutProps {
  isLoading?: boolean;
  totalReleases?: number;
  onClickAddRelease: () => void;
  children: React.ReactNode;
}

export const ReleasesLayout = ({
  isLoading,
  totalReleases,
  onClickAddRelease,
  children,
}: ReleasesLayoutProps) => {
  const { formatMessage } = useIntl();
  return (
    <Main aria-busy={isLoading}>
      <HeaderLayout
        title={formatMessage({
          id: 'content-releases.pages.Releases.title',
          defaultMessage: 'Releases',
        })}
        subtitle={
          !isLoading &&
          formatMessage(
            {
              id: 'content-releases.pages.Releases.header-subtitle',
              defaultMessage:
                '{number, plural, =0 {No releases} one {# release} other {# releases}}',
            },
            { number: totalReleases }
          )
        }
        primaryAction={
          <CheckPermissions permissions={PERMISSIONS.create}>
            <Button startIcon={<Plus />} onClick={onClickAddRelease}>
              {formatMessage({
                id: 'content-releases.header.actions.add-release',
                defaultMessage: 'New release',
              })}
            </Button>
          </CheckPermissions>
        }
      />
      {children}
    </Main>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ReleasesGrid
 * -----------------------------------------------------------------------------------------------*/
interface ReleasesGridProps {
  sectionTitle: 'pending' | 'done';
  releases?: GetReleases.Response['data'];
  isError?: boolean;
}

const LinkCard = styled(Link)`
  display: block;
`;

const ReleasesGrid = ({ sectionTitle, releases = [], isError = false }: ReleasesGridProps) => {
  const { formatMessage } = useIntl();

  if (isError) {
    return <AnErrorOccurred />;
  }

  if (releases?.length === 0) {
    return (
      <EmptyStateLayout
        content={formatMessage(
          {
            id: 'content-releases.page.Releases.tab.emptyEntries',
            defaultMessage: 'No releases',
          },
          {
            target: sectionTitle,
          }
        )}
        icon={<EmptyDocuments width="10rem" />}
      />
    );
  }

  return (
    <Grid gap={4}>
      {releases.map(({ id, name, actions }) => (
        <GridItem col={3} s={6} xs={12} key={id}>
          <LinkCard href={`content-releases/${id}`} isExternal={false}>
            <Flex
              direction="column"
              justifyContent="space-between"
              padding={4}
              hasRadius
              background="neutral0"
              shadow="tableShadow"
              height="100%"
              width="100%"
              alignItems="start"
              gap={2}
            >
              <Typography as="h3" variant="delta" fontWeight="bold">
                {name}
              </Typography>
              <Typography variant="pi">
                {formatMessage(
                  {
                    id: 'content-releases.page.Releases.release-item.entries',
                    defaultMessage:
                      '{number, plural, =0 {No entries} one {# entry} other {# entries}}',
                  },
                  { number: actions.meta.count }
                )}
              </Typography>
            </Flex>
          </LinkCard>
        </GridItem>
      ))}
    </Grid>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ReleasesPage
 * -----------------------------------------------------------------------------------------------*/
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

  const totalReleases = (isSuccess && response.currentData?.meta?.pagination?.total) || 0;

  const handleTabChange = (index: number) => {
    setQuery({
      ...query,
      page: 1,
      pageSize: response?.currentData?.meta?.pagination?.pageSize || 16,
      filters: {
        releasedAt: {
          $notNull: index === 0 ? false : true,
        },
      },
    });
  };

  const activeTab = response?.currentData?.meta?.activeTab || 'pending';

  return (
    <ReleasesLayout onClickAddRelease={toggleAddReleaseDialog} totalReleases={totalReleases}>
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
            <Box paddingBottom={8}>
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
                <ReleasesGrid
                  sectionTitle="pending"
                  releases={response?.currentData?.data}
                  isError={isError}
                />
              </TabPanel>
              {/* Done releases */}
              <TabPanel>
                <ReleasesGrid
                  sectionTitle="done"
                  releases={response?.currentData?.data}
                  isError={isError}
                />
              </TabPanel>
            </TabPanels>
          </TabGroup>
          {totalReleases > 0 && (
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
