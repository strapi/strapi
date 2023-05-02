import React from 'react';
import PropTypes from 'prop-types';
import { Box, Flex, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';

export function ReviewWorkflowsStageEE({ color, name }) {
  return (
    <Flex alignItems="center" gap={2} maxWidth={pxToRem(300)}>
      <Box height={2} background={color} hasRadius shrink={0} width={2} />

      <Typography fontWeight="regular" textColor="neutral700" ellipsis>
        {name}
      </Typography>
    </Flex>
  );
}

ReviewWorkflowsStageEE.propTypes = {
  color: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};
