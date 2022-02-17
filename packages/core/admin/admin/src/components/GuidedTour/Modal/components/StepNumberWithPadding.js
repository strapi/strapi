import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import StepNumber from '../../Stepper/StepNumber';

const StepNumberWithPadding = ({ number, last, type }) => (
  <Box paddingTop={3} paddingBottom={last ? 0 : 3}>
    <StepNumber number={number} type={type} />
  </Box>
);

StepNumberWithPadding.defaultProps = {
  number: undefined,
  last: false,
  type: '',
};

StepNumberWithPadding.propTypes = {
  number: PropTypes.number,
  last: PropTypes.bool,
  type: PropTypes.string,
};

export default StepNumberWithPadding;
