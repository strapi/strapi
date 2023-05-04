import * as React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { Flex, Typography } from '@strapi/design-system';

import { getStageColorByHex } from '../../../../../utils/colors';

export function SingleValueColor({ children, ...props }) {
  const { color } = props.data;
  // in case an entity was not assigned to a stage (which displays an error)
  // there is no color to display and we have to make sure the component does
  // not crash
  const { themeColorName } = color ? getStageColorByHex(color) : {};

  return (
    <components.SingleValue {...props}>
      <Flex alignItems="center" gap={2}>
        <Flex
          height={2}
          background={color}
          borderColor={themeColorName === 'neutral0' ? 'neutral150' : 'transparent'}
          hasRadius
          shrink={0}
          width={2}
        />

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
