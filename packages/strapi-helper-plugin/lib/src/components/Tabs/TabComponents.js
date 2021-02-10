import React from 'react';
import styled from 'styled-components';
import { Flex, Text } from '@buffetjs/core';

export const TabNavRaw = styled(props => <Flex flexDirection="column" {...props} />)`
  width: 100%;
`;

export const TabsRaw = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  margin-left: ${props => (props.position === 'right' ? 'auto' : 0)};
  border-bottom: 1px solid ${props => props.theme.main.colors.brightGrey};
`;

export const TabButton = styled(props => (
  <Text
    as="button"
    textTransform="uppercase"
    fontSize="sm"
    fontWeight={props['aria-selected'] ? 'bold' : 'semiBold'}
    color={props['aria-selected'] ? 'mediumBlue' : 'grey'}
    {...props}
  />
))`
  height: 3.8rem;
  letter-spacing: 0.7px;
  margin-left: 3rem;
  border-bottom: 2px solid
    ${props => (props['aria-selected'] ? props.theme.main.colors.mediumBlue : 'transparent')};
  padding: 0;
`;

export const TabPanelRaw = styled.div`
  padding: 2.2rem 0;
`;
