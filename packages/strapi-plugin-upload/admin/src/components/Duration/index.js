import React from 'react';
import styled from 'styled-components';
import { themePropTypes } from 'strapi-helper-plugin';
import { Text } from '@buffetjs/core';

import formatDuration from './utils/formatDuration';

const Duration = styled(({ duration, ...rest }) => (
  <Text {...rest} color="white" fontSize="md" fontWeight="semiBold">
    {formatDuration(duration)}
  </Text>
))`
  position: absolute;
  bottom: 10px;
  right: 10px;
  padding: 3px 5px;
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  background-color: ${({ theme }) => theme.main.colors.black};
`;

Duration.propTypes = {
  ...themePropTypes,
};

export default Duration;
