import React from 'react';
import styled from 'styled-components';

import { Flex } from '@strapi/design-system/Flex';

import { useFolderCard } from './FolderCardContext';

const StyledBox = styled(Flex)`
  user-select: none;
`;

export const FolderCardBody = props => {
  const { id } = useFolderCard();

  return (
    <StyledBox
      {...props}
      id={`${id}-title`}
      alignItems="flex-start"
      direction="column"
      position="relative"
      zIndex={3}
    />
  );
};
