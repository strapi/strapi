/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import styled from 'styled-components';
import { Flex, Text } from '@buffetjs/core';

export const ProviderButtonWrapper = styled(props => <Flex {...props} />)`
  width: 11rem;
  height: 4.5rem;
  padding: 0.5rem;
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  border: 1px solid ${({ theme }) => theme.main.colors.border};
  cursor: pointer;
  &:hover {
    ${Text} {
      color: ${({ theme }) => theme.main.colors.mediumBlue};
    }
    svg > path {
      fill: ${({ theme }) => theme.main.colors.mediumBlue};
    }
    border: 1px solid ${({ theme }) => theme.main.colors.darkBlue};
    background-color: ${({ theme }) => theme.main.colors.lightestBlue};
  }
`;

export const ProviderLink = styled.a`
  text-decoration: none;

  &:hover {
    text-decoration: none;
  }
`;
