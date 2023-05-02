import React from 'react';
import PropTypes from 'prop-types';
import { Typography } from '@strapi/design-system';

export function ReviewWorkflowsStageEE({ name }) {
  return (
    <Typography fontWeight="regular" textColor="neutral700">
      {name}
    </Typography>
  );
}

ReviewWorkflowsStageEE.propTypes = {
  name: PropTypes.string.isRequired,
};
