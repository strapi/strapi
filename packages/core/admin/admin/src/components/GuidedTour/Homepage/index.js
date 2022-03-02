import React from 'react';
import { useGuidedTour } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { Stack } from '@strapi/design-system/Stack';
import { Flex } from '@strapi/design-system/Flex';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { LinkButton } from '@strapi/design-system/LinkButton';
import { Button } from '@strapi/design-system/Button';
import ArrowRight from '@strapi/icons/ArrowRight';
import StepperHomepage from './components/Stepper';
import layout from '../layout';

const GuidedTourHomepage = () => {
  const { guidedTourState, setSkipped } = useGuidedTour();
  const { formatMessage } = useIntl();

  const sections = Object.entries(layout).map(([key, val]) => ({
    key,
    title: val.home.title,
    content: (
      <LinkButton to={val.home.cta.target} endIcon={<ArrowRight />}>
        {formatMessage(val.home.cta.title)}
      </LinkButton>
    ),
  }));

  const enrichedSections = sections.map(section => ({
    isDone: Object.entries(guidedTourState[section.key]).every(([, value]) => value),
    ...section,
  }));

  const activeSection = enrichedSections.find(section => !section.isDone)?.key;

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
      <Stack size={6}>
        <Typography variant="beta" as="h2">
          {formatMessage({
            id: 'app.components.GuidedTour.title',
            defaultMessage: '3 steps to get started',
          })}
        </Typography>
        <StepperHomepage sections={sections} currentSectionKey={activeSection} />
      </Stack>
      <Flex justifyContent="flex-end">
        <Button variant="tertiary" onClick={() => setSkipped(true)}>
          {formatMessage({ id: 'app.components.GuidedTour.skip', defaultMessage: 'Skip the tour' })}
        </Button>
      </Flex>
    </Box>
  );
};

export default GuidedTourHomepage;
