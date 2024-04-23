import { Box, Button, Flex, Typography } from '@strapi/design-system';
import { LinkButton } from '@strapi/design-system/v2';
import {
  GuidedTourContextValue,
  pxToRem,
  useGuidedTour,
  useTracking,
  useAppInfo,
} from '@strapi/helper-plugin';
import { ArrowRight } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import {
  SUPER_ADMIN_LAYOUT_DATA,
  LAYOUT_DATA,
  States,
  STATES,
  LayoutData,
  SuperAdminLayoutData,
} from './constants';
import { Number, VerticalDivider } from './Ornaments';

interface GuidedTourHomepageProps {
  userRole: string;
}

const GuidedTourHomepage = ({ userRole }: GuidedTourHomepageProps) => {
  const { guidedTourState, setSkipped } = useGuidedTour();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const appInfo = useAppInfo();

  const layout: SuperAdminLayoutData | LayoutData =
    userRole === 'super-admin' ? SUPER_ADMIN_LAYOUT_DATA : LAYOUT_DATA;
  const triggeredBySA = userRole === 'super-admin' ? true : false;

  // Remove the inviteUser step  if we are in the development env
  if (appInfo?.currentEnvironment === 'development') {
    delete layout.inviteUser;
  }

  const sections = Object.entries(layout).map(([key, val]) => ({
    key: key,
    title: val.home.title,
    content: (
      <LinkButton
        onClick={() => trackUsage(val.home.trackingEvent, { triggeredBySA })}
        as={NavLink}
        // @ts-expect-error - types are not inferred correctly through the as prop.
        to={val.home.cta.target}
        endIcon={<ArrowRight />}
      >
        {formatMessage(val.home.cta.title)}
      </LinkButton>
    ),
    isDone: Object.entries(
      guidedTourState[key as keyof GuidedTourContextValue['guidedTourState']]
    ).every(([, value]) => value),
  }));

  const activeSectionIndex = sections.findIndex((section) => !section.isDone);

  const handleSkip = () => {
    setSkipped(true);
    trackUsage('didSkipGuidedtour', { triggeredBySA });
  };

  return (
    <Box
      hasRadius
      shadow="tableShadow"
      paddingTop={7}
      paddingRight={4}
      paddingLeft={7}
      paddingBottom={4}
      background="neutral0"
    >
      <Flex direction="column" alignItems="stretch" gap={6}>
        <Typography variant="beta" as="h2">
          {formatMessage(
            {
              id: 'app.components.GuidedTour.title',
              defaultMessage: '{count} steps to get started',
            },
            { count: Object.keys(layout).length }
          )}
        </Typography>
        <Box>
          {sections.map((section, index) => {
            const state = getState(activeSectionIndex, index);
            return (
              <Box key={section.key}>
                <Flex>
                  <Box minWidth={pxToRem(30)} marginRight={5}>
                    <Number state={state}>{index + 1}</Number>
                  </Box>
                  <Typography variant="delta" as="h3">
                    {formatMessage(section.title)}
                  </Typography>
                </Flex>
                <Flex alignItems="flex-start">
                  <Flex
                    justifyContent="center"
                    minWidth={pxToRem(30)}
                    marginBottom={3}
                    marginTop={3}
                    marginRight={5}
                  >
                    {index === sections.length - 1 ? null : <VerticalDivider state={state} />}
                  </Flex>
                  <Box marginTop={2}>{state === STATES.IS_ACTIVE ? section.content : null}</Box>
                </Flex>
              </Box>
            );
          })}
        </Box>
      </Flex>
      <Flex justifyContent="flex-end">
        <Button variant="tertiary" onClick={handleSkip}>
          {formatMessage({ id: 'app.components.GuidedTour.skip', defaultMessage: 'Skip the tour' })}
        </Button>
      </Flex>
    </Box>
  );
};

const getState = (activeSectionIndex: number, index: number): States => {
  if (activeSectionIndex === -1) {
    return STATES.IS_DONE;
  }
  if (index < activeSectionIndex) {
    return STATES.IS_DONE;
  }
  if (index > activeSectionIndex) {
    return STATES.IS_NOT_DONE;
  }
  return STATES.IS_ACTIVE;
};

export { GuidedTourHomepage };
