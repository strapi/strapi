import * as React from 'react';

import { Box, Button, Dialog, Flex, Link, ProgressBar, Typography } from '@strapi/design-system';
import { CheckCircle, ChevronRight } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { styled, useTheme } from 'styled-components';

import { useTracking } from '../../features/Tracking';
import { useGetGuidedTourMetaQuery } from '../../services/admin';
import { ConfirmDialog } from '../ConfirmDialog';

import { type ValidTourName, useGuidedTour, getCompletedTours } from './Context';
import { GUIDED_TOUR_REQUIRED_ACTIONS } from './utils/constants';

/* -------------------------------------------------------------------------------------------------
 * Styled
 * -----------------------------------------------------------------------------------------------*/

const StyledProgressBar = styled(ProgressBar)`
  width: 100%;
  background-color: ${({ theme }) => theme.colors.neutral150};
  > div {
    background-color: ${({ theme }) => theme.colors.success500};
  }
`;

const Container = styled(Flex)`
  width: 100%;
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: ${({ theme }) => theme.colors.neutral0};
  box-shadow: ${({ theme }) => theme.shadows.tableShadow};
  align-items: stretch;
`;

const ContentSection = styled(Flex)`
  flex: 1;
  padding: ${({ theme }) => theme.spaces[8]};
`;

const VerticalSeparator = styled.div`
  width: 1px;
  background-color: ${({ theme }) => theme.colors.neutral150};
`;

const TourTaskContainer = styled(Flex)`
  &:not(:last-child) {
    border-bottom: ${({ theme }) => `1px solid ${theme.colors.neutral150}`};
  }
  padding: ${({ theme }) => theme.spaces[4]};
`;

const TodoCircle = styled(Box)`
  border: 1px solid ${({ theme }) => theme.colors.neutral300};
  border-radius: 50%;
  height: 13px;
  width: 13px;
`;

/* -------------------------------------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------------------------------------*/

const LINK_LABEL = {
  id: 'tours.overview.tour.link',
  defaultMessage: 'Start',
};
const DONE_LABEL = {
  id: 'tours.overview.tour.done',
  defaultMessage: 'Done',
};

const TASK_CONTENT = [
  {
    tourName: 'contentTypeBuilder',
    link: {
      label: LINK_LABEL,
      to: '/plugins/content-type-builder',
    },
    title: {
      id: 'tours.overview.contentTypeBuilder.label',
      defaultMessage: 'Create your schema',
    },
    done: DONE_LABEL,
  },
  {
    tourName: 'contentManager',
    link: {
      label: LINK_LABEL,
      to: '/content-manager',
    },
    title: {
      id: 'tours.overview.contentManager.label',
      defaultMessage: 'Create and publish content',
    },
    done: DONE_LABEL,
  },
  {
    tourName: 'apiTokens',
    link: {
      label: LINK_LABEL,
      to: '/settings/api-tokens',
    },
    title: {
      id: 'tours.overview.apiTokens.label',
      defaultMessage: 'Copy an API token',
    },
    done: DONE_LABEL,
  },
  {
    tourName: 'strapiCloud',
    link: {
      label: {
        id: 'tours.overview.strapiCloud.link',
        defaultMessage: 'Read documentation',
      },
      to: 'https://docs.strapi.io/cloud/intro',
    },
    title: {
      id: 'tours.overview.strapiCloud.label',
      defaultMessage: 'Deploy your application to Strapi Cloud',
    },
    done: DONE_LABEL,
    isExternal: true,
  },
];

/* -------------------------------------------------------------------------------------------------
 * GuidedTourOverview
 * -----------------------------------------------------------------------------------------------*/

const WaveIcon = () => {
  const theme = useTheme();
  return (
    <svg width="26" height="27" viewBox="0 0 26 27" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M24.4138 9.30762C25.1565 10.5578 25.6441 11.9429 25.8481 13.3827C26.0522 14.8225 25.9687 16.2885 25.6026 17.6958C25.2365 19.1032 24.5949 20.4239 23.7151 21.5818C22.8352 22.7396 21.7345 23.7114 20.4766 24.4411C19.2188 25.1708 17.8287 25.6439 16.3868 25.8329C14.945 26.022 13.48 25.9232 12.0765 25.5424C10.673 25.1616 9.35903 24.5063 8.21045 23.6144C7.06188 22.7226 6.10154 21.6118 5.385 20.3464L0.268755 11.4851C0.0253867 11.0275 -0.0308559 10.4934 0.111878 9.99514C0.254612 9.49692 0.585176 9.07356 1.03392 8.81426C1.48266 8.55497 2.01453 8.47999 2.51746 8.60514C3.02039 8.73028 3.45511 9.04576 3.73001 9.48512L6.05 13.5001C6.11567 13.6139 6.20309 13.7136 6.30729 13.7936C6.41148 13.8735 6.53041 13.9322 6.65728 13.9662C6.78415 14.0002 6.91647 14.0089 7.04669 13.9918C7.17692 13.9746 7.3025 13.932 7.41625 13.8664C7.53001 13.8007 7.62972 13.7133 7.70969 13.6091C7.78966 13.5049 7.84833 13.386 7.88234 13.2591C7.91635 13.1322 7.92504 12.9999 7.90791 12.8697C7.89078 12.7395 7.84817 12.6139 7.78251 12.5001L2.87501 4.00012C2.63164 3.54255 2.57539 3.00837 2.71813 2.51014C2.86086 2.01192 3.19143 1.58856 3.64017 1.32926C4.08891 1.06997 4.62078 0.994994 5.12371 1.12014C5.62664 1.24528 6.06136 1.56077 6.33626 2.00012L11.25 10.5001C11.3137 10.6175 11.4003 10.7209 11.5046 10.8042C11.609 10.8876 11.7289 10.9492 11.8575 10.9854C11.986 11.0216 12.1205 11.0318 12.253 11.0152C12.3855 10.9986 12.5133 10.9556 12.629 10.8888C12.7446 10.8221 12.8457 10.7328 12.9263 10.6263C13.0068 10.5198 13.0653 10.3982 13.0981 10.2688C13.1309 10.1394 13.1375 10.0047 13.1174 9.87264C13.0974 9.74062 13.0511 9.61395 12.9813 9.50012L9.23125 3.00012C8.9738 2.54125 8.90753 1.99941 9.04682 1.49203C9.18612 0.984641 9.51974 0.552582 9.97539 0.289483C10.431 0.0263834 10.972 -0.0465606 11.4811 0.0864587C11.9902 0.219478 12.4263 0.547745 12.695 1.00012L17.75 9.76512C16.6322 10.8916 16.0035 12.4132 16 14.0001C15.9963 15.2989 16.4177 16.5633 17.2 17.6001C17.278 17.7074 17.3766 17.7981 17.49 17.867C17.6034 17.9358 17.7293 17.9814 17.8605 18.001C17.9917 18.0207 18.1255 18.0141 18.2541 17.9816C18.3827 17.9491 18.5035 17.8913 18.6096 17.8116C18.7156 17.7319 18.8048 17.6319 18.8718 17.5175C18.9388 17.403 18.9824 17.2763 19 17.1448C19.0176 17.0134 19.0089 16.8797 18.9743 16.7516C18.9398 16.6236 18.8801 16.5036 18.7988 16.3989C18.4824 15.9765 18.2528 15.4958 18.1231 14.9843C17.9934 14.4729 17.9661 13.9408 18.0429 13.4188C18.1197 12.8967 18.2991 12.3951 18.5706 11.9426C18.8421 11.4902 19.2005 11.096 19.625 10.7826C19.8224 10.6365 19.9592 10.4229 20.0092 10.1825C20.0592 9.94202 20.019 9.69157 19.8963 9.47887L18.4638 7.00012C18.2063 6.54125 18.14 5.99941 18.2793 5.49203C18.4186 4.98464 18.7522 4.55258 19.2079 4.28948C19.6635 4.02638 20.2045 3.95344 20.7136 4.08646C21.2227 4.21948 21.6588 4.54774 21.9275 5.00012L24.4138 9.30762ZM20.7425 2.18262C21.4432 2.36725 22.1001 2.68931 22.6752 3.13008C23.2503 3.57084 23.7321 4.12153 24.0925 4.75012L24.1338 4.82137C24.2664 5.05111 24.4848 5.21877 24.741 5.28745C24.8679 5.32146 25.0002 5.33015 25.1304 5.31302C25.2607 5.29589 25.3862 5.25328 25.5 5.18762C25.6138 5.12196 25.7135 5.03453 25.7934 4.93034C25.8734 4.82614 25.9321 4.70721 25.9661 4.58035C26.0001 4.45348 26.0088 4.32115 25.9917 4.19093C25.9745 4.0607 25.9319 3.93513 25.8663 3.82137L25.825 3.75012C25.3335 2.89321 24.6767 2.14252 23.8926 1.54167C23.1085 0.940821 22.2128 0.501801 21.2575 0.250119C21.002 0.184041 20.7307 0.221665 20.5028 0.354786C20.2749 0.487908 20.1088 0.705731 20.0409 0.960766C19.9729 1.2158 20.0085 1.48736 20.14 1.71625C20.2714 1.94513 20.488 2.11277 20.7425 2.18262ZM6.9475 25.2151C5.65171 24.1925 4.56342 22.9315 3.74126 21.5001C3.67559 21.3864 3.58817 21.2866 3.48397 21.2067C3.37978 21.1267 3.26085 21.068 3.13398 21.034C3.00711 21 2.87479 20.9913 2.74456 21.0085C2.61434 21.0256 2.48876 21.0682 2.37501 21.1339C2.26125 21.1995 2.16154 21.287 2.08157 21.3911C2.00159 21.4953 1.94293 21.6143 1.90892 21.7411C1.87491 21.868 1.86622 22.0003 1.88335 22.1306C1.90048 22.2608 1.94309 22.3864 2.00875 22.5001C2.95782 24.1511 4.21368 25.6056 5.70875 26.7851C5.91728 26.9455 6.18063 27.0173 6.44172 26.9849C6.70282 26.9525 6.94062 26.8185 7.10359 26.612C7.26655 26.4054 7.34156 26.143 7.31234 25.8815C7.28313 25.62 7.15204 25.3806 6.9475 25.2151Z"
        fill={theme.colors.primary600}
      />
    </svg>
  );
};

export const GuidedTourHomepageOverview = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const tourState = useGuidedTour('Overview', (s) => s.state.tours);
  const dispatch = useGuidedTour('Overview', (s) => s.dispatch);
  const enabled = useGuidedTour('Overview', (s) => s.state.enabled);
  const hidden = useGuidedTour('Overview', (s) => s.state.hidden);
  const completedActions = useGuidedTour('Overview', (s) => s.state.completedActions);
  const { data: guidedTourMeta } = useGetGuidedTourMetaQuery();

  const tourNames = Object.keys(tourState) as ValidTourName[];
  const completedTours = getCompletedTours(tourState);
  const completionPercentage =
    tourNames.length > 0 ? Math.round((completedTours.length / tourNames.length) * 100) : 0;

  const handleConfirmDialog = () => {
    trackUsage('didSkipGuidedTour', { name: 'all' });
    dispatch({ type: 'skip_all_tours' });
  };

  const handleStartTour = (tourName: ValidTourName) => {
    trackUsage('didStartGuidedTour', { name: tourName, fromHomepage: true });

    if (tourName === 'strapiCloud') {
      trackUsage('didCompleteGuidedTour', { name: tourName });
      dispatch({ type: 'next_step', payload: tourName });
    }
  };

  if (
    !guidedTourMeta?.data?.isFirstSuperAdminUser ||
    !enabled ||
    hidden ||
    process.env.NODE_ENV !== 'development'
  ) {
    return null;
  }

  return (
    <Container tag="section" gap={0}>
      {/* Greeting */}
      <ContentSection direction="column" gap={2} alignItems="start">
        <WaveIcon />
        <Flex direction="column" alignItems="start" gap={1} paddingTop={4}>
          <Typography tag="h2" fontSize="20px" fontWeight="bold">
            {formatMessage({
              id: 'tours.overview.title',
              defaultMessage: 'Discover your application!',
            })}
          </Typography>
          <Typography>
            {formatMessage({
              id: 'tours.overview.subtitle',
              defaultMessage: 'Follow the guided tour to get the most out of Strapi.',
            })}
          </Typography>
        </Flex>
        <Flex
          direction="column"
          alignItems="flex-start"
          width="100%"
          paddingTop={5}
          paddingBottom={8}
          gap={2}
        >
          <Typography variant="pi">
            {formatMessage(
              {
                id: 'tours.overview.completed',
                defaultMessage: '{completed}% completed',
              },
              { completed: completionPercentage }
            )}
          </Typography>
          <StyledProgressBar value={completionPercentage} />
        </Flex>
        <Dialog.Root>
          <Dialog.Trigger>
            <Button variant="tertiary">
              {formatMessage({
                id: 'tours.overview.close',
                defaultMessage: 'Close guided tour',
              })}
            </Button>
          </Dialog.Trigger>
          <ConfirmDialog onConfirm={handleConfirmDialog}>
            {formatMessage({
              id: 'tours.overview.close.description',
              defaultMessage: 'Are you sure you want to close the guided tour?',
            })}
          </ConfirmDialog>
        </Dialog.Root>
      </ContentSection>
      <VerticalSeparator />
      {/* Task List */}
      <ContentSection direction="column" alignItems="start">
        <Typography variant="omega" fontWeight="bold">
          {formatMessage({
            id: 'tours.overview.tasks',
            defaultMessage: 'Your tasks',
          })}
        </Typography>
        <Box tag="ul" width="100%" borderColor="neutral150" marginTop={4} hasRadius>
          {TASK_CONTENT.map((task) => {
            const tourName = task.tourName as ValidTourName;
            const tour = tourState[tourName];

            const isLinkDisabled =
              tourName !== 'contentTypeBuilder' &&
              !completedActions.includes(
                GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema
              );

            return (
              <TourTaskContainer
                tag="li"
                aria-label={formatMessage(task.title)}
                key={tourName}
                alignItems="center"
                justifyContent="space-between"
              >
                {tour.isCompleted ? (
                  <>
                    <Flex gap={2}>
                      <CheckCircle fill="success500" />
                      <Typography style={{ textDecoration: 'line-through' }} textColor="neutral500">
                        {formatMessage(task.title)}
                      </Typography>
                    </Flex>
                    <Typography variant="omega" textColor="neutral500">
                      {formatMessage(task.done)}
                    </Typography>
                  </>
                ) : (
                  <>
                    <Flex gap={2} alignItems="center">
                      <Flex height="16px" width="16px" justifyContent="center">
                        <TodoCircle />
                      </Flex>
                      <Typography>{formatMessage(task.title)}</Typography>
                    </Flex>
                    {task.isExternal ? (
                      <Link
                        isExternal
                        disabled={isLinkDisabled}
                        href={task.link.to}
                        onClick={() => handleStartTour(task.tourName as ValidTourName)}
                      >
                        {formatMessage(task.link.label)}
                      </Link>
                    ) : (
                      <Link
                        endIcon={<ChevronRight />}
                        disabled={isLinkDisabled}
                        to={task.link.to}
                        tag={NavLink}
                        onClick={() =>
                          trackUsage('didStartGuidedTour', { name: tourName, fromHomepage: true })
                        }
                      >
                        {formatMessage(task.link.label)}
                      </Link>
                    )}
                  </>
                )}
              </TourTaskContainer>
            );
          })}
        </Box>
      </ContentSection>
    </Container>
  );
};
