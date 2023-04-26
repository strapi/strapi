import * as React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { Box, Flex, Typography } from '@strapi/design-system';

export function SingleValueColor({ children, ...props }) {
  const { color } = props.data;

  return (
    <components.SingleValue {...props}>
      <Flex alignItems="center" gap={2}>
        <Box height={2} background={color} hasRadius width={2} />

        <Typography textColor="neutral800" ellipsis>
          {children}
        </Typography>
      </Flex>
    </components.SingleValue>
  );
}

SingleValueColor.defaultProps = {
  children: null,
};

SingleValueColor.propTypes = {
  children: PropTypes.node,
  data: PropTypes.shape({
    color: PropTypes.string,
  }).isRequired,
};
