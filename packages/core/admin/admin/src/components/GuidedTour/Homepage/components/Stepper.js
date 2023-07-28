import React from 'react';

import { Box } from '@strapi/design-system';
import PropTypes from 'prop-types';

import { IS_ACTIVE, IS_DONE, IS_NOT_DONE } from '../../constants';

import StepHomepage from './Step';

const getType = (activeSectionIndex, index) => {
  if (activeSectionIndex === -1) {
    return IS_DONE;
  }
  if (index < activeSectionIndex) {
    return IS_DONE;
  }
  if (index > activeSectionIndex) {
    return IS_NOT_DONE;
  }

  return IS_ACTIVE;
};

const StepperHomepage = ({ sections, currentSectionKey }) => {
  const activeSectionIndex = sections.findIndex((section) => section.key === currentSectionKey);

  return (
    <Box>
      {sections.map((section, index) => (
        <StepHomepage
          key={section.key}
          title={section.title}
          content={section.content}
          number={index + 1}
          type={getType(activeSectionIndex, index)}
          hasLine={index !== sections.length - 1}
        />
      ))}
    </Box>
  );
};

StepperHomepage.defaultProps = {
  currentSectionKey: undefined,
};

StepperHomepage.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      title: PropTypes.shape({
        id: PropTypes.string,
        defaultMessage: PropTypes.string,
      }).isRequired,
      content: PropTypes.node,
    })
  ).isRequired,
  currentSectionKey: PropTypes.string,
};

export default StepperHomepage;
