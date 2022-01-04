import React from 'react';
import PropTypes from 'prop-types';
import { pxToRem } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';

const StepLine = ({ type, ...props }) => {
  return (
    <Box
      width={pxToRem(2)}
      height="100%"
      background={type === 'isNotDone' ? 'neutral300' : 'primary500'}
      hasRadius
      {...props}
    />
  );
};

StepLine.defaultProps = {
  type: 'isNotDone',
};

StepLine.propTypes = {
  type: PropTypes.oneOf(['isActive', 'isDone', 'isNotDone']),
};

export default StepLine;
