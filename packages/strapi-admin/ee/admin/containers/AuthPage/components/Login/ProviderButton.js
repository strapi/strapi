/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import styled from 'styled-components';
import { Flex } from '@buffetjs/core';

const ProviderButton = styled(props => <Flex {...props} />)`
  border: 1px solid lightgrey;
  padding: 0.5rem;
  width: 11rem;
  height: 4.5rem;
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
`;

export default ProviderButton;
