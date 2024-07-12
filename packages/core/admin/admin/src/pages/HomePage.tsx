import * as React from 'react';

import {
  Box,
  Button,
  Flex,
  Divider,
  IconButton,
  Grid,
  Main,
  Typography,
  Link,
  LinkButton,
  TypographyComponent,
  BoxComponent,
  FlexComponent,
  Tabs,
  Table,
  Thead,
  Tr,
  Th,
  Td,
  VisuallyHidden,
  Tbody,
  Combobox,
  ComboboxOption,
  Badge,
} from '@strapi/design-system';
import {
  ArrowRight,
  ExternalLink,
  Key,
  List,
  Images,
  Stack,
  SquaresFour,
  Earth,
  PaperPlane,
  Pencil,
  Eye,
  Typhoon,
} from '@strapi/icons';
import {
  CodeSquare,
  Discord,
  Discourse,
  FeatherSquare,
  GitHub,
  InformationSquare,
  PlaySquare,
  Reddit,
  Strapi,
  X as Twitter,
} from '@strapi/icons/symbols';
import { format, id } from 'date-fns';
import { entries } from 'lodash';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { date } from 'yup';

import { ContentBox } from '../components/ContentBox';
import { GuidedTourHomepage } from '../components/GuidedTour/Homepage';
import { useGuidedTour } from '../components/GuidedTour/Provider';
import { Layouts } from '../components/Layouts/Layout';
import { Page } from '../components/PageHelpers';
import { useAppInfo } from '../features/AppInfo';
import { useTracking } from '../features/Tracking';
import { useContentTypes } from '../hooks/useContentTypes';
import { useEnterprise } from '../hooks/useEnterprise';
import { useGetStatisticsQuery } from '../services/admin';

import bars from './assets/Bars.png';
import cornerOrnamentPath from './assets/corner-ornament.svg';
import legend from './assets/Legends.png';
import cloudIconBackgroundImage from './assets/strapi-cloud-background.png';
import cloudFlagsImage from './assets/strapi-cloud-flags.svg';
/* -------------------------------------------------------------------------------------------------
 * HomePageCE
 * -----------------------------------------------------------------------------------------------*/
type ResponseData = {
  name: string;
  entries: number;
  assets: number;
  contentTypes: number;
  components: number;
  locales: number;
  totalReleases: number;
  webhooks: number;
  apiTokens: number;
  releases: {
    upcoming: Array<{ id: string; name: string; scheduled: string }>;
    assignedToMe: Array<{ id: string; name: string; contentType: string; locale: string }>;
  };
  lastActivies: Array<{
    action: string;
    user: string;
    date: string;
    uid: string;
    documentId: string;
  }>;
  topContributors: Array<{
    user: string;
    entries: number;
  }>;
};

const ListIcon = styled(List)`
  background-color: ${({ theme }) => theme.colors.primary600};
  border-radius: 4px;
  padding: 0.5rem;
`;

const ImagesIcon = styled(Images)`
  background-color: ${({ theme }) => theme.colors.warning600};
  border-radius: 4px;
  padding: 0.5rem;
`;

const StackIcon = styled(Stack)`
  background-color: ${({ theme }) => theme.colors.secondary500};
  border-radius: 4px;
  padding: 0.5rem;
`;

const SquaresFourIcon = styled(SquaresFour)`
  background-color: ${({ theme }) => theme.colors.alternative600};
  border-radius: 4px;
  padding: 0.5rem;
`;

const EarthIcon = styled(Earth)`
  background-color: ${({ theme }) => theme.colors.success500};
  border-radius: 4px;
  padding: 0.5rem;
`;

const PaperPlaneIcon = styled(PaperPlane)`
  background-color: ${({ theme }) => theme.colors.danger600};
  border-radius: 4px;
  padding: 0.5rem;
`;

const SparkleIcon = styled(Typhoon)`
  background-color: ${({ theme }) => theme.colors.alternative500};
  border-radius: 4px;
  padding: 0.5rem;
`;

const KeyIcon = styled(Key)`
  background-color: ${({ theme }) => theme.colors.neutral1000};
  border-radius: 4px;
  padding: 0.5rem;
`;

const getStatistics = (data: ResponseData) => {
  return [
    {
      label: 'Entries',
      value: data.entries,
      icon: <ListIcon fill="neutral0" />,
      iconBackground: 'primary100',
    },
    {
      label: 'Assets',
      value: data.assets,
      icon: <ImagesIcon fill="neutral0" />,
      iconBackground: 'warning100',
    },
    {
      label: 'Content types',
      value: data.contentTypes,
      icon: <StackIcon fill="neutral0" />,
      iconBackground: 'secondary100',
    },
    {
      label: 'Components',
      value: data.components,
      icon: <SquaresFourIcon fill="neutral0" />,
      iconBackground: 'alternative100',
    },
    {
      label: 'Locales',
      value: data.locales,
      icon: <EarthIcon fill="neutral0" />,
      iconBackground: 'success100',
    },
    {
      label: 'Total releases',
      value: data.releases,
      icon: <PaperPlaneIcon fill="neutral0" />,
      iconBackground: 'danger100',
    },
    {
      label: 'Webhooks',
      value: data.webhooks,
      icon: <SparkleIcon fill="neutral0" />,
      iconBackground: 'alternative100',
    },
    {
      label: 'API tokens',
      value: data.apiTokens,
      icon: <KeyIcon fill="neutral0" />,
      iconBackground: 'neutral150',
    },
  ];
};

const HomePageCE = () => {
  const [activeReleasesTab, setActiveReleasesTab] = React.useState<string>('upcomingReleases');
  const [activeActivitiesTab, setActiveActivitiesTab] = React.useState<string>('lastActivities');
  const [activePerformancesTab, setActivePerformancesTab] = React.useState<string>('apiRequests');
  const [activeLogsTab, setActiveLogsTab] = React.useState<string>('slowestRequests');
  const { formatMessage, formatDate, formatNumber } = useIntl();
  // Temporary until we develop the menu API
  const { collectionTypes, singleTypes, isLoading: isLoadingForModels } = useContentTypes();
  const guidedTourState = useGuidedTour('HomePage', (state) => state.guidedTourState);
  const isGuidedTourVisible = useGuidedTour('HomePage', (state) => state.isGuidedTourVisible);
  const isSkipped = useGuidedTour('HomePage', (state) => state.isSkipped);
  const {
    data,
    isError: isErrorStatistics,
    isLoading: isLoadingStatistics,
  } = useGetStatisticsQuery();

  const showGuidedTour =
    !Object.values(guidedTourState).every((section) =>
      Object.values(section).every((step) => step)
    ) &&
    isGuidedTourVisible &&
    !isSkipped;
  const navigate = useNavigate();
  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();

    navigate('/plugins/content-type-builder/content-types/create-content-type');
  };

  const hasAlreadyCreatedContentTypes = collectionTypes.length > 1 || singleTypes.length > 0;

  if (isLoadingForModels || isLoadingStatistics) {
    return <Page.Loading />;
  }

  if (isErrorStatistics) {
    return <Page.Error />;
  }

  // we need to start working on this page
  const mockedData = {
    name: 'Simone',
    entries: 114000,
    assets: 48693,
    contentTypes: 37,
    components: 71,
    locales: 3,
    totalReleases: 13,
    webhooks: 2,
    apiTokens: 2,
    releases: {
      upcoming: [
        {
          name: 'Summer 2024',
          scheduled: '2024-07-21T00:00:00.000Z',
          id: '1',
        },
        {
          name: 'Winter 2024',
          scheduled: '2024-12-21T00:00:00.000Z',
          id: '2',
        },
        {
          name: 'Spring 2025',
          scheduled: '2025-03-21T00:00:00.000Z',
          id: '3',
        },
      ],
      assignedToMe: [
        {
          id: 1,
          name: 'Arsenal 23/24 Home Jersey',
          contentType: 'article',
          locale: 'English',
        },
        {
          id: 2,
          name: 'PSG 23/24 Home Jersey',
          contentType: 'article',
          locale: 'Spanish',
        },
        {
          id: 3,
          name: 'Manchester 23/24 Home Jersey',
          contentType: 'article',
          locale: 'German',
        },
      ],
    },
    lastActivies: [
      {
        action: 'Create entry (category)',
        user: 'Aurélien Georget',
        date: '2024-07-10T12:35:13.000Z',
        uid: 'api::address.address',
        documentId: 'suop02h0cwok8cbced2hkz0w',
      },
      {
        action: 'Update entry (article)',
        user: 'Florent Baldino',
        date: '2024-07-10T12:34:57.000Z',
        uid: 'api::address.address',
        documentId: 'suop02h0cwok8cbced2hkz0w',
      },
      {
        action: 'Delete user',
        user: 'Yevheniia Korsakova',
        date: '2024-07-10T11:11:38.000Z',
        uid: 'api::address.address',
        documentId: 'suop02h0cwok8cbced2hkz0w',
      },
    ],
    topContributors: [
      {
        user: 'Aurélien Georget',
        entries: 114,
      },
      {
        user: 'Florent Baldino',
        entries: 112,
      },
      {
        user: 'Yevheniia Korsakova',
        entries: 98,
      },
    ],
    slowestRequests: [
      {
        route: '/api/articles?populate=cover',
        action: 'GET',
        averageResponseTime: 931,
      },
      {
        route: '/api/search?q=Stripe',
        action: 'POST',
        averageResponseTime: 649,
      },
      {
        route: '/api/registerNewsletter',
        action: 'POST',
        averageResponseTime: 571,
      },
      {
        route: '/api/registerNewsletter',
        action: 'PATCH',
        averageResponseTime: 482,
      },
    ],
  };

  const statistics = getStatistics(data.statistics);

  const getBadgeColor = (action: string) => {
    switch (action) {
      case 'GET':
        return { color: 'secondary500', background: 'secondary100' };
      case 'POST':
        return { color: 'warning600', background: 'warning100' };
      case 'PATCH':
        return { color: 'alternative600', background: 'alternative100' };
      default:
        return { color: 'secondary500', background: 'secondary100' };
    }
  };

  return (
    <Layouts.Root>
      <Page.Title>
        {formatMessage({
          id: 'HomePage.head.title',
          defaultMessage: 'Homepage',
        })}
      </Page.Title>
      <Main>
        <LogoContainer>
          <img alt="" aria-hidden src={cornerOrnamentPath} />
        </LogoContainer>
        <Box padding={10}>
          <Grid.Root>
            <Grid.Item col={8} s={12}>
              <div>
                <Box paddingBottom={10}>
                  <Flex direction="column" alignItems="flex-start" gap={5}>
                    <Typography tag="h1" variant="alpha">
                      {hasAlreadyCreatedContentTypes
                        ? formatMessage(
                            {
                              id: 'app.components.HomePage.welcome.again',
                              defaultMessage: 'Welcome {name} 👋',
                            },
                            {
                              name: data.name,
                            }
                          )
                        : formatMessage(
                            {
                              id: 'app.components.HomePage.welcome',
                              defaultMessage: 'Welcome on board, {name}!👋',
                            },
                            {
                              name: data.name,
                            }
                          )}
                    </Typography>

                    {!hasAlreadyCreatedContentTypes && (
                      <>
                        <WordWrap textColor="neutral600" variant="epsilon">
                          {formatMessage({
                            id: 'app.components.HomePage.welcomeBlock.content',
                            defaultMessage:
                              'Congrats! You are logged as the first administrator. To discover the powerful features provided by Strapi, we recommend you to create your first Content type!',
                          })}
                        </WordWrap>
                        <Button size="L" onClick={handleClick} endIcon={<ArrowRight />}>
                          {formatMessage({
                            id: 'app.components.HomePage.create',
                            defaultMessage: 'Create your first Content type',
                          })}
                        </Button>
                      </>
                    )}
                  </Flex>
                </Box>
              </div>
            </Grid.Item>
          </Grid.Root>
          <Typography color="neutral0" fontSize={3} fontWeight="bold">
            {formatMessage({
              id: 'app.components.HomePage.statistics.sectionTitle',
              defaultMessage: 'Project statistics',
            })}
          </Typography>
          <Grid.Root gap={6} marginTop={4}>
            {statistics.map((statistic) => (
              <Grid.Item key={statistic.label} col={3} s={6}>
                <StatisticsCard
                  label={statistic.label}
                  value={statistic.value}
                  icon={statistic.icon}
                  iconBackground={statistic.iconBackground}
                />
              </Grid.Item>
            ))}

            {/* <Grid.Item col={8} s={12}>
              {showGuidedTour ? <GuidedTourHomepage /> : <ContentBlocks />}
            </Grid.Item>
            <Grid.Item col={4} s={12}>
              <SocialLinks />
            </Grid.Item> */}
          </Grid.Root>
          <Grid.Root gap={6} marginTop={7} marginBottom={8}>
            <Grid.Item col={6} s={12}>
              <Tabs.Root
                variant="simple"
                value={activeReleasesTab}
                onValueChange={(value) => setActiveReleasesTab(value)}
              >
                <Box paddingBottom={8}>
                  <Tabs.List
                    aria-label={formatMessage({
                      id: 'app.components.HomePage.releasesStatistics',
                      defaultMessage: 'Releases Statistics',
                    })}
                  >
                    <Tabs.Trigger value="upcomingReleases">
                      {formatMessage({
                        id: 'app.components.HomePage.releasesStatistics.tab.upcoming',
                        defaultMessage: 'Upcoming releases',
                      })}
                    </Tabs.Trigger>
                    <Tabs.Trigger value="assignedToMe">
                      {formatMessage({
                        id: 'app.components.HomePage.releasesStatistics.tab.assigned',
                        defaultMessage: 'Assigned to me',
                      })}
                    </Tabs.Trigger>
                  </Tabs.List>
                  <Divider />
                </Box>
                {/* Upcoming releases */}
                <Tabs.Content value="upcomingReleases">
                  <Table colCount={3} rowCount={data.releases.upcoming.length}>
                    <Thead>
                      <Tr>
                        <Th>
                          <Typography variant="sigma" textColor="neutral600">
                            {formatMessage({
                              id: 'app.components.HomePage.releasesStatistics.tab.assigned.name',
                              defaultMessage: 'Name',
                            })}
                          </Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma" textColor="neutral600">
                            {formatMessage({
                              id: 'app.components.HomePage.releasesStatistics.tab.assigned.scheduled',
                              defaultMessage: 'Scheduled',
                            })}
                          </Typography>
                        </Th>
                        <Th>
                          <VisuallyHidden>Actions</VisuallyHidden>
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {data.releases.upcoming.slice(0, 3).map((release) => (
                        <React.Fragment key={release.id}>
                          <Tr>
                            <Td>
                              <Typography textColor="neutral800" fontWeight="bold" ellipsis>
                                {release.name}
                              </Typography>
                            </Td>
                            <Td>
                              <Typography textColor="neutral800">
                                {formatDate(new Date(release.scheduledAt), {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: 'numeric',
                                  second: 'numeric',
                                  hour12: false,
                                })}
                              </Typography>
                            </Td>
                            <Td>
                              <IconButton
                                onClick={() => navigate(`plugins/content-releases/${release.id}`)}
                                label={formatMessage(
                                  {
                                    id: 'app.components.HomePage.releasesStatistics.tab.assigned.scheduled.actions.edit',
                                    defaultMessage: 'Edit {name} release',
                                  },
                                  {
                                    name: release.name,
                                  }
                                )}
                                borderWidth={0}
                              >
                                <Pencil />
                              </IconButton>
                            </Td>
                          </Tr>
                        </React.Fragment>
                      ))}
                    </Tbody>
                  </Table>
                </Tabs.Content>
                {/* Assigned to me releases */}
                <Tabs.Content value="assignedToMe">
                  <Table colCount={4} rowCount={data.assignedToMe.length}>
                    <Thead>
                      <Tr>
                        <Th>
                          <Typography variant="sigma" textColor="neutral600">
                            {formatMessage({
                              id: 'app.components.HomePage.releasesStatistics.tab.assigned.name',
                              defaultMessage: 'Name',
                            })}
                          </Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma" textColor="neutral600">
                            {formatMessage({
                              id: 'app.components.HomePage.releasesStatistics.tab.assigned.contentType',
                              defaultMessage: 'Content Type',
                            })}
                          </Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma" textColor="neutral600">
                            {formatMessage({
                              id: 'app.components.HomePage.releasesStatistics.tab.assigned.locale',
                              defaultMessage: 'Locale',
                            })}
                          </Typography>
                        </Th>
                        <Th>
                          <VisuallyHidden>Actions</VisuallyHidden>
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {data.assignedToMe.slice(0, 3).map((entry) => (
                        <React.Fragment key={`${entry.contentType.uid}/${entry.entry.id}`}>
                          <Tr>
                            <Td>
                              <Typography textColor="neutral800" fontWeight="bold" ellipsis>
                                {entry.entry.name}
                              </Typography>
                            </Td>
                            <Td>
                              <Typography textColor="neutral800">
                                {entry.contentType.name}
                              </Typography>
                            </Td>
                            <Td>
                              <Typography textColor="neutral800">{entry.entry.locale}</Typography>
                            </Td>
                            <Td>
                              <IconButton
                                onClick={() =>
                                  navigate(
                                    `content-manager/collection-types/${entry.contentType.uid}/${entry.entry.documentId}`
                                  )
                                }
                                label={formatMessage(
                                  {
                                    id: 'app.components.HomePage.releasesStatistics.tab.assigned.scheduled.actions.open',
                                    defaultMessage: 'Open {name} entry',
                                  },
                                  {
                                    name: entry.contentType.uid,
                                  }
                                )}
                                borderWidth={0}
                              >
                                <Eye />
                              </IconButton>
                            </Td>
                          </Tr>
                        </React.Fragment>
                      ))}
                    </Tbody>
                  </Table>
                </Tabs.Content>
              </Tabs.Root>
            </Grid.Item>
            <Grid.Item col={6} s={12}>
              <Tabs.Root
                variant="simple"
                value={activeActivitiesTab}
                onValueChange={(value) => setActiveActivitiesTab(value)}
              >
                <Box paddingBottom={8}>
                  <Tabs.List
                    aria-label={formatMessage({
                      id: 'app.components.HomePage.activitiesStatistics',
                      defaultMessage: 'Activity Statistics',
                    })}
                  >
                    <Tabs.Trigger value="lastActivities">
                      {formatMessage({
                        id: 'app.components.HomePage.releasesStatistics.tab.last',
                        defaultMessage: 'Last activities',
                      })}
                    </Tabs.Trigger>
                    <Tabs.Trigger value="topContributors">
                      {formatMessage({
                        id: 'app.components.HomePage.releasesStatistics.tab.contributors',
                        defaultMessage: 'Top contributors',
                      })}
                    </Tabs.Trigger>
                  </Tabs.List>
                  <Divider />
                </Box>
                {/* Last activities releases */}
                <Tabs.Content value="lastActivities">
                  <Table colCount={4} rowCount={data.lastActivities.length}>
                    <Thead>
                      <Tr>
                        <Th>
                          <Typography variant="sigma" textColor="neutral600">
                            {formatMessage({
                              id: 'app.components.HomePage.releasesStatistics.tab.lastActivities.action',
                              defaultMessage: 'Action',
                            })}
                          </Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma" textColor="neutral600">
                            {formatMessage({
                              id: 'app.components.HomePage.releasesStatistics.tab.lastActivities.user',
                              defaultMessage: 'User',
                            })}
                          </Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma" textColor="neutral600">
                            {formatMessage({
                              id: 'app.components.HomePage.releasesStatistics.tab.lastActivities.date',
                              defaultMessage: 'Date',
                            })}
                          </Typography>
                        </Th>
                        <Th>
                          <VisuallyHidden>Actions</VisuallyHidden>
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {data.lastActivities.slice(0, 3).map((activity) => (
                        <React.Fragment key={activity.documentId}>
                          <Tr>
                            <Td>
                              <Typography textColor="neutral800" fontWeight="bold" ellipsis>
                                {activity.action}
                              </Typography>
                            </Td>
                            <Td>
                              <Typography textColor="neutral800">
                                {activity.payload.user?.firstname} {activity.payload.user?.lastname}
                              </Typography>
                            </Td>
                            <Td>
                              <Typography textColor="neutral800">
                                {formatDate(new Date(activity.date), {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: 'numeric',
                                  second: 'numeric',
                                  hour12: false,
                                })}
                              </Typography>
                            </Td>
                            <Td>
                              <IconButton
                                onClick={() =>
                                  navigate(
                                    `content-manager/collection-types/${activity.uid}/${activity.documentId}`
                                  )
                                }
                                label={formatMessage(
                                  {
                                    id: 'app.components.HomePage.releasesStatistics.tab.assigned.scheduled.actions.open',
                                    defaultMessage: 'Open {name} entry',
                                  },
                                  {
                                    name: activity.action,
                                  }
                                )}
                                borderWidth={0}
                              >
                                <Eye />
                              </IconButton>
                            </Td>
                          </Tr>
                        </React.Fragment>
                      ))}
                    </Tbody>
                  </Table>
                </Tabs.Content>
                {/* Top contributors */}
                <Tabs.Content value="topContributors">
                  <Table colCount={2} rowCount={data.topContributors.length}>
                    <Thead>
                      <Tr>
                        <Th>
                          <Typography variant="sigma" textColor="neutral600">
                            {formatMessage({
                              id: 'app.components.HomePage.contrubutors.tab.contributors.user',
                              defaultMessage: 'User',
                            })}
                          </Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma" textColor="neutral600">
                            {formatMessage({
                              id: 'app.components.HomePage.contrubutors.tab.contributors.entries',
                              defaultMessage: 'Entries Created',
                            })}
                          </Typography>
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {data.topContributors.slice(0, 3).map((contributor) => (
                        <React.Fragment key={contributor.user}>
                          <Tr height={11}>
                            <Td>
                              <Typography textColor="neutral800" fontWeight="bold" ellipsis>
                                {contributor.user.firstname} {contributor.user.lastname}
                              </Typography>
                            </Td>
                            <Td>
                              <Typography textColor="neutral800">
                                {formatNumber(contributor.creations)}
                              </Typography>
                            </Td>
                          </Tr>
                        </React.Fragment>
                      ))}
                    </Tbody>
                  </Table>
                </Tabs.Content>
              </Tabs.Root>
            </Grid.Item>
          </Grid.Root>
          <Typography color="neutral0" fontSize={3} fontWeight="bold">
            {formatMessage({
              id: 'app.components.HomePage.usage.sectionTitle',
              defaultMessage: 'Usage',
            })}
          </Typography>
          <Grid.Root gap={6} marginTop={7} marginBottom={8}>
            <Grid.Item col={6} s={12}>
              <Tabs.Root
                variant="simple"
                value={activePerformancesTab}
                onValueChange={(value) => setActivePerformancesTab(value)}
              >
                <Box paddingBottom={8}>
                  <Tabs.List
                    aria-label={formatMessage({
                      id: 'app.components.HomePage.performances',
                      defaultMessage: 'Performances',
                    })}
                  >
                    <Tabs.Trigger value="apiRequests">
                      {formatMessage({
                        id: 'app.components.HomePage.performances.tab.api',
                        defaultMessage: 'Api Requests',
                      })}
                    </Tabs.Trigger>
                    <Tabs.Trigger value="assetsBandwidth">
                      {formatMessage({
                        id: 'app.components.HomePage.performances.tab.assets',
                        defaultMessage: 'Assets bandwidth',
                      })}
                    </Tabs.Trigger>
                  </Tabs.List>
                  <Divider />
                </Box>
                {/* Api requests */}
                <Tabs.Content value="apiRequests">
                  <Flex
                    shadow="tableShadow"
                    hasRadius
                    padding={6}
                    background="neutral0"
                    direction="column"
                    gap={4}
                  >
                    <Flex
                      style={{
                        alignSelf: 'flex-end',
                      }}
                    >
                      <Combobox
                        aria-label="change timeframe"
                        value="week"
                        onChange={() => console.log('change')}
                      >
                        <ComboboxOption value="week">This week</ComboboxOption>
                        <ComboboxOption value="year">This year</ComboboxOption>
                      </Combobox>
                    </Flex>
                    <img src={bars} alt="Graph" />
                    <img src={legend} alt="Legend" />
                  </Flex>
                </Tabs.Content>
                {/* Assets bandwidth */}
                <Tabs.Content value="assetsBandwidth">
                  <Flex shadow="tableShadow" hasRadius padding={6} background="neutral0"></Flex>
                </Tabs.Content>
              </Tabs.Root>
            </Grid.Item>
            <Grid.Item col={6} s={12}>
              <Tabs.Root
                variant="simple"
                value={activeLogsTab}
                onValueChange={(value) => setActiveLogsTab(value)}
              >
                <Box paddingBottom={8}>
                  <Tabs.List
                    aria-label={formatMessage({
                      id: 'app.components.HomePage.logs',
                      defaultMessage: 'Logs',
                    })}
                  >
                    <Tabs.Trigger value="slowestRequests">
                      {formatMessage({
                        id: 'app.components.HomePage.logs.tab.slowestRequests',
                        defaultMessage: 'Slowest Requests',
                      })}
                    </Tabs.Trigger>
                    <Tabs.Trigger value="errorLogs">
                      {formatMessage({
                        id: 'app.components.HomePage.logs.tab.logs',
                        defaultMessage: 'Error logs',
                      })}
                    </Tabs.Trigger>
                  </Tabs.List>
                  <Divider />
                </Box>
                {/* Slowest Requests */}
                <Tabs.Content value="slowestRequests">
                  <Table colCount={4} rowCount={mockedData.slowestRequests.length}>
                    <Thead>
                      <Tr>
                        <Th>
                          <Typography variant="sigma" textColor="neutral600">
                            {formatMessage({
                              id: 'app.components.HomePage.performances.tab.slowestRequests.route',
                              defaultMessage: 'Route',
                            })}
                          </Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma" textColor="neutral600">
                            {formatMessage({
                              id: 'app.components.HomePage.performances.tab.slowestRequests.action',
                              defaultMessage: 'Action',
                            })}
                          </Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma" textColor="neutral600">
                            {formatMessage({
                              id: 'app.components.HomePage.performances.tab.slowestRequests.avgResponseTime',
                              defaultMessage: 'Avg Resp. Time',
                            })}
                          </Typography>
                        </Th>
                        <Th>
                          <VisuallyHidden>Actions</VisuallyHidden>
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {mockedData.slowestRequests.map((request) => (
                        <React.Fragment key={request.route}>
                          <Tr>
                            <Td>
                              <Typography textColor="neutral800" ellipsis>
                                {request.route}
                              </Typography>
                            </Td>
                            <Td>
                              <Badge backgroundColor={getBadgeColor(request.action).background}>
                                <Typography textColor={getBadgeColor(request.action).color}>
                                  {request.action}
                                </Typography>
                              </Badge>
                            </Td>
                            <Td>
                              <Typography textColor="danger600">{`${request.averageResponseTime}ms`}</Typography>
                            </Td>
                            <Td>
                              <IconButton
                                onClick={() => console.log('clicked')}
                                label={formatMessage(
                                  {
                                    id: 'app.components.HomePage.performances.tab.slowestRequests.open',
                                    defaultMessage: 'Open {name}',
                                  },
                                  {
                                    name: request.action,
                                  }
                                )}
                                borderWidth={0}
                              >
                                <Eye />
                              </IconButton>
                            </Td>
                          </Tr>
                        </React.Fragment>
                      ))}
                    </Tbody>
                  </Table>
                </Tabs.Content>
                {/* Top contributors */}
                <Tabs.Content value="errorLogs">
                  <Flex shadow="tableShadow" hasRadius padding={6} background="neutral0"></Flex>
                </Tabs.Content>
              </Tabs.Root>
            </Grid.Item>
          </Grid.Root>
        </Box>
      </Main>
    </Layouts.Root>
  );
};

const LogoContainer = styled<BoxComponent>(Box)`
  position: absolute;
  top: 0;
  right: 0;

  img {
    width: 15rem;
  }
`;

const WordWrap = styled<TypographyComponent>(Typography)`
  word-break: break-word;
`;

/* -------------------------------------------------------------------------------------------------
 * StatisticsCard
 * -----------------------------------------------------------------------------------------------*/
const IconWrapper = styled<FlexComponent>(Flex)`
  margin-right: ${({ theme }) => theme.spaces[6]};

  svg {
    width: 3.2rem;
    height: 3.2rem;
  }
`;

const TypographyWordBreak = styled<TypographyComponent>(Typography)`
  color: ${({ theme }) => theme.colors.neutral800};
  word-break: break-all;
`;

const StatisticsCard = ({
  label,
  value,
  icon,
  iconBackground,
}: {
  label: string;
  value: number;
  icon: React.ForwardRefExoticComponent<
    Omit<React.SVGProps<SVGSVGElement>, 'ref'> & React.RefAttributes<SVGSVGElement>
  >;
  iconBackground: string;
}) => {
  const { formatNumber } = useIntl();
  return (
    <Flex shadow="tableShadow" hasRadius padding={6} background="neutral0">
      <IconWrapper background={iconBackground} hasRadius padding={3}>
        {icon}
      </IconWrapper>
      <Flex direction="column" alignItems="stretch" gap={1}>
        <TypographyWordBreak fontWeight="bold" variant="delta">
          {label}
        </TypographyWordBreak>
        <Typography textColor="neutral600">{formatNumber(value)}</Typography>
      </Flex>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ContentBlocks
 * -----------------------------------------------------------------------------------------------*/

const ContentBlocks = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  return (
    <Flex direction="column" alignItems="stretch" gap={5}>
      <BlockLink
        href="https://cloud.strapi.io"
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={() => {
          trackUsage('didClickOnTryStrapiCloudSection');
        }}
      >
        <Flex
          shadow="tableShadow"
          hasRadius
          padding={6}
          background="neutral0"
          position="relative"
          gap={6}
        >
          <CloudCustomWrapper hasRadius padding={3}>
            <CloudIconWrapper
              width="3.2rem"
              height="3.2rem"
              justifyContent="center"
              hasRadius
              alignItems="center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="15" fill="none">
                <path
                  fill="#fff"
                  fillRule="evenodd"
                  d="M4.39453 13.8298C1.93859 13.6455 0 11.468 0 8.80884 0 6.0289 2.11876 3.7753 4.73238 3.7753c.46775 0 .91964.07218 1.34638.20664C7.21234 1.62909 9.66469 0 12.5073 0c2.5102 0 4.7161 1.27036 5.9782 3.18766a4.54297 4.54297 0 0 1 .6132-.04144C21.8056 3.14622 24 5.54066 24 8.49436c0 2.89194-2.1036 5.24784-4.7323 5.34504v.0031l-1.8948.278a38.18054 38.18054 0 0 1-11.08354 0l-1.89483-.278v-.0127Z"
                  clipRule="evenodd"
                />
              </svg>
            </CloudIconWrapper>
          </CloudCustomWrapper>
          <Flex gap={1} direction="column" alignItems="start">
            <Typography fontWeight="semiBold" variant="pi" textColor="neutral800">
              {formatMessage({
                id: 'app.components.BlockLink.cloud',
                defaultMessage: 'Strapi Cloud',
              })}
            </Typography>
            <Typography textColor="neutral600">
              {formatMessage({
                id: 'app.components.BlockLink.cloud.content',
                defaultMessage:
                  'A fully composable, and collaborative platform to boost your team velocity.',
              })}
            </Typography>
            <Box src={cloudFlagsImage} position="absolute" top={0} right={0} tag="img" />
          </Flex>
        </Flex>
      </BlockLink>
      <BlockLink
        href="https://strapi.io/resource-center"
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={() => trackUsage('didClickonReadTheDocumentationSection')}
      >
        <ContentBox
          title={formatMessage({
            id: 'global.documentation',
            defaultMessage: 'Documentation',
          })}
          subtitle={formatMessage({
            id: 'app.components.BlockLink.documentation.content',
            defaultMessage: 'Discover the essential concepts, guides and instructions.',
          })}
          icon={<InformationSquare />}
          iconBackground="primary100"
        />
      </BlockLink>
      <BlockLink
        href="https://strapi.io/starters"
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={() => trackUsage('didClickonCodeExampleSection')}
      >
        <ContentBox
          title={formatMessage({
            id: 'app.components.BlockLink.code',
            defaultMessage: 'Code example',
          })}
          subtitle={formatMessage({
            id: 'app.components.BlockLink.code.content',
            defaultMessage: 'Learn by using ready-made starters for your projects.',
          })}
          icon={<CodeSquare />}
          iconBackground="warning100"
        />
      </BlockLink>
      <BlockLink
        href="https://strapi.io/blog/categories/tutorials"
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={() => trackUsage('didClickonTutorialSection')}
      >
        <ContentBox
          title={formatMessage({
            id: 'app.components.BlockLink.tutorial',
            defaultMessage: 'Tutorials',
          })}
          subtitle={formatMessage({
            id: 'app.components.BlockLink.tutorial.content',
            defaultMessage: 'Follow step-by-step instructions to use and customize Strapi.',
          })}
          icon={<PlaySquare />}
          iconBackground="secondary100"
        />
      </BlockLink>
      <BlockLink
        href="https://strapi.io/blog"
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={() => trackUsage('didClickonBlogSection')}
      >
        <ContentBox
          title={formatMessage({
            id: 'app.components.BlockLink.blog',
            defaultMessage: 'Blog',
          })}
          subtitle={formatMessage({
            id: 'app.components.BlockLink.blog.content',
            defaultMessage: 'Read the latest news about Strapi and the ecosystem.',
          })}
          icon={<FeatherSquare />}
          iconBackground="alternative100"
        />
      </BlockLink>
    </Flex>
  );
};

const BlockLink = styled.a`
  text-decoration: none;
`;

const CloudCustomWrapper = styled<BoxComponent>(Box)`
  background-image: url(${cloudIconBackgroundImage});
`;

const CloudIconWrapper = styled<FlexComponent>(Flex)`
  background: rgba(255, 255, 255, 0.3);
`;

/* -------------------------------------------------------------------------------------------------
 * SocialLinks
 * -----------------------------------------------------------------------------------------------*/

const SocialLinks = () => {
  const { formatMessage } = useIntl();
  const communityEdition = useAppInfo('SocialLinks', (state) => state.communityEdition);

  const socialLinksExtended = [
    ...SOCIAL_LINKS,
    {
      icon: <StyledStrapi />,
      link: communityEdition
        ? 'https://discord.strapi.io'
        : 'https://support.strapi.io/support/home',
      name: {
        id: 'Settings.application.get-help',
        defaultMessage: 'Get help',
      },
    },
  ];

  return (
    <Flex
      tag="aside"
      direction="column"
      aria-labelledby="join-the-community"
      background="neutral0"
      hasRadius
      paddingRight={5}
      paddingLeft={5}
      paddingTop={6}
      paddingBottom={6}
      shadow="tableShadow"
      gap={7}
    >
      <Flex direction="column" alignItems="stretch" gap={5}>
        <Flex direction="column" alignItems="stretch" gap={3}>
          <Typography variant="delta" tag="h2" id="join-the-community">
            {formatMessage({
              id: 'app.components.HomePage.community',
              defaultMessage: 'Join the community',
            })}
          </Typography>
          <Typography textColor="neutral600">
            {formatMessage({
              id: 'app.components.HomePage.community.content',
              defaultMessage:
                'Discuss with team members, contributors and developers on different channels',
            })}
          </Typography>
        </Flex>
        <Link href="https://feedback.strapi.io/" isExternal endIcon={<ExternalLink />}>
          {formatMessage({
            id: 'app.components.HomePage.roadmap',
            defaultMessage: 'See our road map',
          })}
        </Link>
      </Flex>
      <GridGap>
        {socialLinksExtended.map(({ icon, link, name }) => {
          return (
            <Grid.Item col={6} s={12} key={name.id}>
              <LinkCustom size="L" startIcon={icon} variant="tertiary" href={link} isExternal>
                {formatMessage(name)}
              </LinkCustom>
            </Grid.Item>
          );
        })}
      </GridGap>
    </Flex>
  );
};

const StyledGithub = styled(GitHub)`
  path {
    fill: ${(props) => props.theme.colors.neutral800} !important;
  }
`;

const StyledDiscord = styled(Discord)`
  path {
    fill: #7289da !important;
  }
`;

const StyledReddit = styled(Reddit)`
  > path:first-child {
    fill: #ff4500;
  }

  > path:nth-child(2) {
    fill: #fff;
  }
`;
const StyledStrapi = styled(Strapi)`
  > path:first-child {
    fill: #4945ff;
  }
  > path:nth-child(2) {
    fill: #fff;
  }
  > path:nth-child(4) {
    fill: #9593ff;
  }
`;

const StyledTwitter = styled(Twitter)`
  path:first-child {
    fill: #fff;
  }

  path:nth-child(2) {
    fill: #000 !important;
  }
`;

const StyledDiscourse = styled(Discourse)`
  > path:first-child {
    fill: #231f20;
  }
  > path:nth-child(2) {
    fill: #fff9ae;
  }
  > path:nth-child(3) {
    fill: #00aeef;
  }
  > path:nth-child(4) {
    fill: #00a94f;
  }
  > path:nth-child(5) {
    fill: #f15d22;
  }
  > path:nth-child(6) {
    fill: #e31b23;
  }
`;

const LinkCustom = styled(LinkButton)`
  display: flex;
  align-items: center;
  border: none;

  svg {
    width: ${({ theme }) => theme.spaces[6]};
    height: ${({ theme }) => theme.spaces[6]};
  }

  span {
    word-break: keep-all;
  }
`;

const GridGap = styled(Grid.Root)`
  row-gap: ${({ theme }) => theme.spaces[2]};
  column-gap: ${({ theme }) => theme.spaces[4]};
`;

const SOCIAL_LINKS = [
  {
    name: { id: 'app.components.HomePage.community.links.github', defaultMessage: 'Github' },
    link: 'https://github.com/strapi/strapi/',
    icon: <StyledGithub />,
    alt: 'github',
  },
  {
    name: { id: 'app.components.HomePage.community.links.discord', defaultMessage: 'Discord' },
    link: 'https://discord.strapi.io/',
    icon: <StyledDiscord />,
    alt: 'discord',
  },
  {
    name: { id: 'app.components.HomePage.community.links.reddit', defaultMessage: 'Reddit' },
    link: 'https://www.reddit.com/r/Strapi/',
    icon: <StyledReddit />,
    alt: 'reddit',
  },
  {
    name: { id: 'app.components.HomePage.community.links.twitter', defaultMessage: 'Twitter' },
    link: 'https://twitter.com/strapijs',
    icon: <StyledTwitter />,
    alt: 'twitter',
  },
  {
    name: { id: 'app.components.HomePage.community.links.forum', defaultMessage: 'Forum' },
    link: 'https://forum.strapi.io',
    icon: <StyledDiscourse />,
    alt: 'forum',
  },
  {
    name: { id: 'app.components.HomePage.community.links.blog', defaultMessage: 'Blog' },
    link: 'https://strapi.io/blog?utm_source=referral&utm_medium=admin&utm_campaign=career%20page',
    icon: <StyledStrapi />,
    alt: 'blog',
  },
  {
    name: {
      id: 'app.components.HomePage.community.links.career',
      defaultMessage: 'We are hiring!',
    },
    link: 'https://strapi.io/careers?utm_source=referral&utm_medium=admin&utm_campaign=blog',
    icon: <StyledStrapi />,
    alt: 'career',
  },
];

/* -------------------------------------------------------------------------------------------------
 * HomePage
 * -----------------------------------------------------------------------------------------------*/

const HomePage = () => {
  const Page = useEnterprise(
    HomePageCE,
    // eslint-disable-next-line import/no-cycle
    async () => (await import('../../../ee/admin/src/pages/HomePage')).HomePageEE
  );

  // block rendering until the EE component is fully loaded
  if (!Page) {
    return null;
  }

  return <Page />;
};

export { HomePage, HomePageCE };
