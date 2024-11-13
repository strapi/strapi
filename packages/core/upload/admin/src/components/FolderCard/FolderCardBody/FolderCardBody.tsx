import { Flex, FlexProps } from '@strapi/design-system';
import { styled } from 'styled-components';

import { useFolderCard } from '../contexts/FolderCard';

const StyledBox = styled(Flex)`
  user-select: none;
`;

export const FolderCardBody = (props: FlexProps) => {
  const { id } = useFolderCard();

  return (
    <StyledBox
      {...props}
      id={`${id}-title`}
      data-testid={`${id}-title`}
      alignItems="flex-start"
      direction="column"
      maxWidth="100%"
      overflow="hidden"
      position="relative"
    />
  );
};
