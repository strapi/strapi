import * as React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { Flex, Typography } from '@strapi/design-system';

export function OptionColor({ children, ...props }) {
  const { color } = props.data;

  return (
    <components.Option {...props}>
      <Flex alignItems="center" gap={2}>
        <Flex height={2} background={color} hasRadius shrink={0} width={2} />

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
    color: PropTypes.string,
  }).isRequired,
};
