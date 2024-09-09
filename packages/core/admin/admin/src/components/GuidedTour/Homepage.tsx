import { Box, Button, Flex, Typography, LinkButton } from '@strapi/design-system';
import { ArrowRight } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { useTracking } from '../../features/Tracking';

import { LAYOUT_DATA, States, STATES } from './constants';
import { Number, VerticalDivider } from './Ornaments';
import { GuidedTourContextValue, useGuidedTour } from './Provider';

type SectionName = keyof GuidedTourContextValue['guidedTourState'];

const GuidedTourHomepage = () => {
  const guidedTourState = useGuidedTour('GuidedTourHomepage', (state) => state.guidedTourState);
  const setSkipped = useGuidedTour('GuidedTourHomepage', (state) => state.setSkipped);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const sections = Object.entries(LAYOUT_DATA).map(([key, val]) => ({
    key: key,
    title: val.home.title,
    content: (
      <LinkButton
        onClick={() => trackUsage(val.home.trackingEvent)}
        tag={NavLink}
        to={val.home.cta.target}
        endIcon={<ArrowRight />}
      >
        {formatMessage(val.home.cta.title)}
      </LinkButton>
    ),
    isDone: Object.values(guidedTourState[key as SectionName]).every((value) => value === true),
  }));

  const activeSectionIndex = sections.findIndex((section) => !section.isDone);

  const handleSkip = () => {
    setSkipped(true);
    trackUsage('didSkipGuidedtour');
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
        <Typography variant="beta" tag="h2">
          {formatMessage({
            id: 'app.components.GuidedTour.title',
            defaultMessage: '3 steps to get started',
          })}
        </Typography>
        <Box>
          {sections.map((section, index) => {
            const state = getState(activeSectionIndex, index);

            return (
              <Box key={section.key}>
                <Flex>
                  <Box minWidth={`3rem`} marginRight={5}>
                    <Number state={state}>{index + 1}</Number>
                  </Box>
                  <Typography variant="delta" tag="h3">
                    {formatMessage(section.title)}
                  </Typography>
                </Flex>
                <Flex alignItems="flex-start">
                  <Flex
                    justifyContent="center"
                    minWidth={`3rem`}
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
