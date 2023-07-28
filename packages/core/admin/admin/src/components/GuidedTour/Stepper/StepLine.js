import React from 'react';

import { Box } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';

import { IS_ACTIVE, IS_DONE, IS_NOT_DONE } from '../constants';

const StepLine = ({ type, ...props }) => {
  return (
    <Box
      width={pxToRem(2)}
      height="100%"
      background={type === IS_NOT_DONE ? 'neutral300' : 'primary500'}
      hasRadius
      {...props}
    />
  );
};

StepLine.defaultProps = {
  type: IS_NOT_DONE,
};

StepLine.propTypes = {
  type: PropTypes.oneOf([IS_ACTIVE, IS_DONE, IS_NOT_DONE]),
};

export default StepLine;
