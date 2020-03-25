import React from 'react';
import styled from 'styled-components';
import { themePropTypes } from 'strapi-helper-plugin';

import Text from '../Text';

const Duration = styled(props => (
  <Text {...props} color="white" fontSize="md" fontWeight="semiBold" />
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
