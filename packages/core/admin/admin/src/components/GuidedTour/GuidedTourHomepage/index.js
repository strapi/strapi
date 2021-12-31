import React from 'react';
import { useIntl } from 'react-intl';
import { useGuidedTour } from '@strapi/helper-plugin';
// import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
// import { LinkButton } from '@strapi/design-system/LinkButton';
import Stepper from '../Stepper';
import Step from '../Stepper/Step';
import layout from '../layout';

// const steps = [
//   {
//     title: 'What would you like to share with the world?',
//     number: 1,
//     content:<><LinkButton to="/content-manager">Create sample data</LinkButton><Box height="63px" width="1px" /></>,
//     type: 'isDone'
//   },
// ]

const GuidedTourHomepage = () => {
  const { formatMessage } = useIntl();
  const { guidedTourState } = useGuidedTour();

  const sections = Object.entries(layout).map(([key, val]) => ({ key, ...val.home }));

  const enrichedSections = sections.map(section => ({
    isDone: Object.entries(guidedTourState[section.key]).every(([, value]) => value),
    ...section,
  }));

  const activeSection = enrichedSections.find(section => !section.isDone).key;

  const stepType = (key, isActive) => {
    if (key === isActive) {
      return 'isCurrent';
    }

    return null;
  };

  return (
    <Stack size={6} hasRadius shadow="tableShadow" padding={7} background="neutral0">
      <Typography variant="beta" as="h2">
        Guided tour
      </Typography>
      <Stepper>
        {enrichedSections.map((section, index) => (
          <Step
            key={section.key}
            type={stepType(section.key, activeSection)}
            title={formatMessage(section.title)}
            // content={step.content}
            number={index + 1}
          />
        ))}
      </Stepper>
    </Stack>
    // <Stack size={5}>
    //   {enrichedSections.map(section => (
    //     <Box hasRadius shadow="tableShadow" background="neutral0" padding={5} key={section.key}>
    //       <Typography>{formatMessage(section.title)}</Typography>
    //       {section.key === activeSection && (
    //         <LinkButton to={section.cta.target}>{formatMessage(section.cta.title)}</LinkButton>
    //       )}
    //     </Box>
    //   ))}
    // </Stack>
  );
};

export default GuidedTourHomepage;
