import React from 'react';
import { useGuidedTour } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { LinkButton } from '@strapi/design-system/LinkButton';
import ArrowRight from '@strapi/icons/ArrowRight'
import Stepper from '../Stepper';
import layout from '../layout';

const GuidedTourHomepage = () => {
  const { guidedTourState } = useGuidedTour();
  const { formatMessage } = useIntl();

  const sections = Object.entries(layout).map(([key, val]) => ({
    key,
    title: val.home.title,
    content: <LinkButton to={val.home.cta.target} endIcon={<ArrowRight />}>{formatMessage(val.home.cta.title)}</LinkButton>
  }));
  console.log(sections);

  const enrichedSections = sections.map(section => ({
    isDone: Object.entries(guidedTourState[section.key]).every(([, value]) => value),
    ...section,
  }));

  const activeSection = enrichedSections.find(section => !section.isDone).key;

  return (
    <Stack size={6} hasRadius shadow="tableShadow" padding={7} background="neutral0">
      <Typography variant="beta" as="h2">
        Guided tour
      </Typography>
      <Stepper sections={sections} currentSectionKey={activeSection} />
    </Stack>
  );
};

export default GuidedTourHomepage;
