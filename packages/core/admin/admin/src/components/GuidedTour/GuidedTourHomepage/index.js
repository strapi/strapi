import React from 'react';
import { useIntl } from 'react-intl';
import { useGuidedTour } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { LinkButton } from '@strapi/design-system/LinkButton';
import layout from '../layout';

const GuidedTourHomepage = () => {
  const { formatMessage } = useIntl();
  const { guidedTourState } = useGuidedTour();

  const sections = Object.entries(layout).map(([key, val]) => ({ key, ...val.home }));

  const enrichedSections = sections.map(section => ({
    isDone: Object.entries(guidedTourState[section.key]).every(([, value]) => value),
    ...section,
  }));

  const activeSection = enrichedSections.find(section => !section.isDone).key;

  return (
    <Stack size={5}>
      {enrichedSections.map(section => (
        <Box hasRadius shadow="tableShadow" background="neutral0" padding={5} key={section.key}>
          <Typography>{formatMessage(section.title)}</Typography>
          {section.key === activeSection && (
            <LinkButton to={section.cta.target}>{formatMessage(section.cta.title)}</LinkButton>
          )}
        </Box>
      ))}
    </Stack>
  );
};

export default GuidedTourHomepage;
