import React from 'react';
import PropTypes from 'prop-types';
import { Box, Flex, Typography } from '@strapi/design-system';

export function ReviewWorkflowsStageEE({ color, name }) {
  return (
    <Flex alignItems="center" gap={2}>
      <Box height={2} background={color} hasRadius width={2} />

      <Typography fontWeight="regular" textColor="neutral700">
        {name}
      </Typography>
    </Flex>
  );
}

ReviewWorkflowsStageEE.propTypes = {
  color: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};
