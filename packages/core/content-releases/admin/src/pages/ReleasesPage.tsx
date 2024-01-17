import * as React from 'react';

import {
  Box,
  Button,
  ContentLayout,
  Divider,
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
  useAPIErrorHandler,
  useNotification,
} from '@strapi/helper-plugin';
import { EmptyDocuments, Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useHistory, useLocation } from 'react-router-dom';
import styled from 'styled-components';

import { GetReleases } from '../../../shared/contracts/releases';
import { ReleaseModal, FormValues } from '../components/ReleaseModal';
import { PERMISSIONS } from '../constants';
import { isAxiosError } from '../services/axios';
import {
  useGetReleasesQuery,
  GetReleasesQueryParams,
  useCreateReleaseMutation,
} from '../services/release';

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
interface CustomLocationState {
  errors?: Record<'code', string>[];
}

const INITIAL_FORM_VALUES = {
  name: '',
} satisfies FormValues;

const ReleasesPage = () => {
  const tabRef = React.useRef<any>(null);
  const location = useLocation<CustomLocationState>();
  const [releaseModalShown, setReleaseModalShown] = React.useState(false);
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { push, replace } = useHistory();
  const { formatAPIError } = useAPIErrorHandler();
  const [{ query }, setQuery] = useQueryParams<GetReleasesQueryParams>();
  const response = useGetReleasesQuery(query);
  const [createRelease, { isLoading: isSubmittingForm }] = useCreateReleaseMutation();

  const { isLoading, isSuccess, isError } = response;
  const activeTab = response?.currentData?.meta?.activeTab || 'pending';
  const activeTabIndex = ['pending', 'done'].indexOf(activeTab);

  // Check if we have some errors and show a notification to the user to explain the error
  React.useEffect(() => {
    if (location?.state?.errors) {
      toggleNotification({
        type: 'warning',
        title: formatMessage({
          id: 'content-releases.pages.Releases.notification.error.title',
          defaultMessage: 'Your request could not be processed.',
        }),
        message: formatMessage({
          id: 'content-releases.pages.Releases.notification.error.message',
          defaultMessage: 'Please try again or open another release.',
        }),
      });
      replace({ state: null });
    }
  }, [formatMessage, location?.state?.errors, replace, toggleNotification]);

  // TODO: Replace this solution with v2 of the Design System
  // Check if the active tab index changes and call the handler of the ref to update the tab group component
  React.useEffect(() => {
    if (tabRef.current) {
      tabRef.current._handlers.setSelectedTabIndex(activeTabIndex);
    }
  }, [activeTabIndex]);

  const toggleAddReleaseModal = () => {
    setReleaseModalShown((prev) => !prev);
  };

  if (isLoading) {
    return (
      <ReleasesLayout onClickAddRelease={toggleAddReleaseModal} isLoading>
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

  const handleAddRelease = async (values: FormValues) => {
    const response = await createRelease({
      name: values.name,
    });
    if ('data' in response) {
      // When the response returns an object with 'data', handle success
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'content-releases.modal.release-created-notification-success',
          defaultMessage: 'Release created.',
        }),
      });

      push(`/plugins/content-releases/${response.data.data.id}`);
    } else if (isAxiosError(response.error)) {
      // When the response returns an object with 'error', handle axios error
      toggleNotification({
        type: 'warning',
        message: formatAPIError(response.error),
      });
    } else {
      // Otherwise, the response returns an object with 'error', handle a generic error
      toggleNotification({
        type: 'warning',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  return (
    <ReleasesLayout onClickAddRelease={toggleAddReleaseModal} totalReleases={totalReleases}>
      <ContentLayout>
        <>
          <TabGroup
            label={formatMessage({
              id: 'content-releases.pages.Releases.tab-group.label',
              defaultMessage: 'Releases list',
            })}
            variant="simple"
            initialSelectedTabIndex={activeTabIndex}
            onTabChange={handleTabChange}
            ref={tabRef}
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
              <Divider />
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
      {releaseModalShown && (
        <ReleaseModal
          handleClose={toggleAddReleaseModal}
          handleSubmit={handleAddRelease}
          isLoading={isSubmittingForm}
          initialValues={INITIAL_FORM_VALUES}
        />
      )}
    </ReleasesLayout>
  );
};

export { ReleasesPage };
