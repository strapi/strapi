import React from 'react';
import styled from 'styled-components';
import { themePropTypes } from 'strapi-helper-plugin';
import { Text } from '@buffetjs/core';

const Wrapper = styled(props => <Text as="ul" fontSize="md" {...props} />)`
  margin-bottom: 0;
  padding: 9px 0 0 0;
  min-width: 228px;
  list-style-type: none;
  background-color: ${({ theme }) => theme.main.colors.white};
`;

Wrapper.propTypes = {
  ...themePropTypes,
};

export default Wrapper;
