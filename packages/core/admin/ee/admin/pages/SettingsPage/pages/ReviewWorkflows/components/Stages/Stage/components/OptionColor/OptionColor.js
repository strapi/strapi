import * as React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { Box, Flex, Typography } from '@strapi/design-system';

export function OptionColor({ children, ...props }) {
  const { value } = props.data;

  return (
    <components.Option {...props}>
      <Flex alignItems="center" gap={2}>
        <Box height={2} background={value} hasRadius width={2} />

        <Typography textColor="neutral800" ellipsis>
          {children}
        </Typography>
      </Flex>
    </components.Option>
  );
}

OptionColor.propTypes = {
  children: PropTypes.node.isRequired,
  data: PropTypes.shape({
    label: PropTypes.string,
    themeColorName: PropTypes.string,
    value: PropTypes.string,
  }).isRequired,
};
