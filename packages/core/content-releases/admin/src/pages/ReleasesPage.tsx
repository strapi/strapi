import * as React from 'react';

import {
  Page,
  Pagination,
  useTracking,
  useAPIErrorHandler,
  useNotification,
  useQueryParams,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import { useLicenseLimits } from '@strapi/admin/strapi-admin/ee';
import {
  Alert,
  Badge,
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
  Link,
} from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';
import { useNavigate, useLocation } from 'react-router-dom';
import { styled } from 'styled-components';

import { GetReleases, type Release } from '../../../shared/contracts/releases';
import { RelativeTime as BaseRelativeTime } from '../components/RelativeTime';
import { ReleaseModal, FormValues } from '../components/ReleaseModal';
import { PERMISSIONS } from '../constants';
import { isAxiosError } from '../services/axios';
import {
  useGetReleasesQuery,
  GetReleasesQueryParams,
  useCreateReleaseMutation,
} from '../services/release';

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

const RelativeTime = styled(BaseRelativeTime)`
  display: inline-block;
  &::first-letter {
    text-transform: uppercase;
  }
`;

const getBadgeProps = (status: Release['status']) => {
  let color;
  switch (status) {
    case 'ready':
      color = 'success';
      break;
    case 'blocked':
      color = 'warning';
      break;
    case 'failed':
      color = 'danger';
      break;
    case 'done':
      color = 'primary';
      break;
    case 'empty':
    default:
      color = 'neutral';
  }

  return {
    textColor: `${color}600`,
    backgroundColor: `${color}100`,
    borderColor: `${color}200`,
  };
};

const ReleasesGrid = ({ sectionTitle, releases = [], isError = false }: ReleasesGridProps) => {
  const { formatMessage } = useIntl();

  if (isError) {
    return <Page.Error />;
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
        icon={<EmptyDocuments width="16rem" />}
      />
    );
  }

  return (
    <Grid gap={4}>
      {releases.map(({ id, name, scheduledAt, status }) => (
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
              gap={4}
            >
              <Flex direction="column" alignItems="start" gap={1}>
                <Typography tag="h3" variant="delta" fontWeight="bold">
                  {name}
                </Typography>
                <Typography variant="pi" textColor="neutral600">
                  {scheduledAt ? (
                    <RelativeTime timestamp={new Date(scheduledAt)} />
                  ) : (
                    formatMessage({
                      id: 'content-releases.pages.Releases.not-scheduled',
                      defaultMessage: 'Not scheduled',
                    })
                  )}
                </Typography>
              </Flex>
              <Badge {...getBadgeProps(status)}>{status}</Badge>
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

const StyledAlert = styled(Alert)`
  button {
    display: none;
  }
  p + div {
    margin-left: auto;
  }
`;

const INITIAL_FORM_VALUES = {
  name: '',
  date: null,
  time: '',
  isScheduled: true,
  scheduledAt: null,
  timezone: null,
} satisfies FormValues;

const ReleasesPage = () => {
  const tabRef = React.useRef<any>(null);
  const location = useLocation();
  const [releaseModalShown, setReleaseModalShown] = React.useState(false);
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { formatAPIError } = useAPIErrorHandler();
  const [{ query }, setQuery] = useQueryParams<GetReleasesQueryParams>();
  const response = useGetReleasesQuery(query);
  const [createRelease, { isLoading: isSubmittingForm }] = useCreateReleaseMutation();
  const { getFeature } = useLicenseLimits();
  const { maximumReleases = 3 } = getFeature('cms-content-releases') as {
    maximumReleases: number;
  };
  const { trackUsage } = useTracking();
  const {
    allowedActions: { canCreate },
  } = useRBAC(PERMISSIONS);

  const { isLoading, isSuccess, isError } = response;
  const activeTab = response?.currentData?.meta?.activeTab || 'pending';
  const activeTabIndex = ['pending', 'done'].indexOf(activeTab);

  // Check if we have some errors and show a notification to the user to explain the error
  React.useEffect(() => {
    if (location?.state?.errors) {
      toggleNotification({
        type: 'danger',
        title: formatMessage({
          id: 'content-releases.pages.Releases.notification.error.title',
          defaultMessage: 'Your request could not be processed.',
        }),
        message: formatMessage({
          id: 'content-releases.pages.Releases.notification.error.message',
          defaultMessage: 'Please try again or open another release.',
        }),
      });
      navigate('', { replace: true, state: null });
    }
  }, [formatMessage, location?.state?.errors, navigate, toggleNotification]);

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
    return <Page.Loading />;
  }

  const totalPendingReleases = (isSuccess && response.currentData?.meta?.pendingReleasesCount) || 0;
  const hasReachedMaximumPendingReleases = totalPendingReleases >= maximumReleases;

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

  const handleAddRelease = async ({ name, scheduledAt, timezone }: FormValues) => {
    const response = await createRelease({
      name,
      scheduledAt,
      timezone,
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

      trackUsage('didCreateRelease');
      navigate(response.data.data.id.toString());
    } else if (isAxiosError(response.error)) {
      // When the response returns an object with 'error', handle axios error
      toggleNotification({
        type: 'danger',
        message: formatAPIError(response.error),
      });
    } else {
      // Otherwise, the response returns an object with 'error', handle a generic error
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  return (
    <Main aria-busy={isLoading}>
      <HeaderLayout
        title={formatMessage({
          id: 'content-releases.pages.Releases.title',
          defaultMessage: 'Releases',
        })}
        subtitle={formatMessage({
          id: 'content-releases.pages.Releases.header-subtitle',
          defaultMessage: 'Create and manage content updates',
        })}
        primaryAction={
          canCreate ? (
            <Button
              startIcon={<Plus />}
              onClick={toggleAddReleaseModal}
              disabled={hasReachedMaximumPendingReleases}
            >
              {formatMessage({
                id: 'content-releases.header.actions.add-release',
                defaultMessage: 'New release',
              })}
            </Button>
          ) : null
        }
      />
      <ContentLayout>
        <>
          {hasReachedMaximumPendingReleases && (
            <StyledAlert
              marginBottom={6}
              action={
                <Link href="https://strapi.io/pricing-cloud" isExternal>
                  {formatMessage({
                    id: 'content-releases.pages.Releases.max-limit-reached.action',
                    defaultMessage: 'Explore plans',
                  })}
                </Link>
              }
              title={formatMessage(
                {
                  id: 'content-releases.pages.Releases.max-limit-reached.title',
                  defaultMessage:
                    'You have reached the {number} pending {number, plural, one {release} other {releases}} limit.',
                },
                { number: maximumReleases }
              )}
              onClose={() => {}}
              closeLabel=""
            >
              {formatMessage({
                id: 'content-releases.pages.Releases.max-limit-reached.message',
                defaultMessage: 'Upgrade to manage an unlimited number of releases.',
              })}
            </StyledAlert>
          )}
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
                  {formatMessage(
                    {
                      id: 'content-releases.pages.Releases.tab.pending',
                      defaultMessage: 'Pending ({count})',
                    },
                    {
                      count: totalPendingReleases,
                    }
                  )}
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
          <Pagination.Root
            {...response?.currentData?.meta?.pagination}
            defaultPageSize={response?.currentData?.meta?.pagination?.pageSize}
          >
            <Pagination.PageSize options={['8', '16', '32', '64']} />
            <Pagination.Links />
          </Pagination.Root>
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
    </Main>
  );
};

export { ReleasesPage, getBadgeProps };
