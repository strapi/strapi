import React from 'react';

import { Box, Button, Flex, Typography } from '@strapi/design-system';
import { LinkButton, useGuidedTour, useTracking } from '@strapi/helper-plugin';
import { ArrowRight } from '@strapi/icons';
import { useIntl } from 'react-intl';

import layout from '../layout';

import StepperHomepage from './components/Stepper';

const GuidedTourHomepage = () => {
  const { guidedTourState, setSkipped } = useGuidedTour();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const sections = Object.entries(layout).map(([key, val]) => ({
    key,
    title: val.home.title,
    content: (
      <LinkButton
        onClick={() => trackUsage(val.home.trackingEvent)}
        to={val.home.cta.target}
        endIcon={<ArrowRight />}
      >
        {formatMessage(val.home.cta.title)}
      </LinkButton>
    ),
  }));

  const enrichedSections = sections.map((section) => ({
    isDone: Object.entries(guidedTourState[section.key]).every(([, value]) => value),
    ...section,
  }));

  const activeSection = enrichedSections.find((section) => !section.isDone)?.key;

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
        <Typography variant="beta" as="h2">
          {formatMessage({
            id: 'app.components.GuidedTour.title',
            defaultMessage: '3 steps to get started',
          })}
        </Typography>
        <StepperHomepage sections={sections} currentSectionKey={activeSection} />
      </Flex>
      <Flex justifyContent="flex-end">
        <Button variant="tertiary" onClick={handleSkip}>
          {formatMessage({ id: 'app.components.GuidedTour.skip', defaultMessage: 'Skip the tour' })}
        </Button>
      </Flex>
    </Box>
  );
};

export default GuidedTourHomepage;
