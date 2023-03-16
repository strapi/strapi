import React from 'react';
import PropTypes from 'prop-types';
import { Typography } from '@strapi/design-system';

export function ReviewWorkflowsStage({ name }) {
  return (
    <Typography fontWeight="regular" textColor="neutral700">
      {name}
    </Typography>
  );
}

ReviewWorkflowsStage.propTypes = {
  name: PropTypes.string.isRequired,
};
