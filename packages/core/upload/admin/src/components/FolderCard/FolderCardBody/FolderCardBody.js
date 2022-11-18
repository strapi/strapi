import React from 'react';
import styled from 'styled-components';

import { Flex } from '@strapi/design-system';
import { useFolderCard } from '../contexts/FolderCard';

const StyledBox = styled(Flex)`
  user-select: none;
`;

export const FolderCardBody = (props) => {
  const { id } = useFolderCard();

  return (
    <StyledBox
      {...props}
      id={`${id}-title`}
      alignItems="flex-start"
      direction="column"
      maxWidth="100%"
      overflow="hidden"
      position="relative"
    />
  );
};
