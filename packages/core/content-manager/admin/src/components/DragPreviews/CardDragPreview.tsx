import { Flex, FlexComponent, Typography } from '@strapi/design-system';
import { Cross, Drag, Pencil } from '@strapi/icons';
import { styled } from 'styled-components';

interface CardDragPreviewProps {
  label: string;
  isSibling?: boolean;
}

const CardDragPreview = ({ label, isSibling = false }: CardDragPreviewProps) => {
  return (
    <FieldContainer
      background={isSibling ? 'neutral100' : 'primary100'}
      display="inline-flex"
      gap={3}
      hasRadius
      justifyContent="space-between"
      $isSibling={isSibling}
      max-height={`3.2rem`}
      maxWidth="min-content"
    >
      <Flex gap={3}>
        <DragButton alignItems="center" cursor="all-scroll" padding={3}>
          <Drag />
        </DragButton>

        <Typography
          textColor={isSibling ? undefined : 'primary600'}
          fontWeight="bold"
          ellipsis
          maxWidth="7.2rem"
        >
          {label}
        </Typography>
      </Flex>

      <Flex>
        <ActionBox alignItems="center">
          <Pencil />
        </ActionBox>

        <ActionBox alignItems="center">
          <Cross />
        </ActionBox>
      </Flex>
    </FieldContainer>
  );
};

const ActionBox = styled<FlexComponent>(Flex)`
  height: ${({ theme }) => theme.spaces[7]};

  &:last-child {
    padding: 0 ${({ theme }) => theme.spaces[3]};
  }
`;

const DragButton = styled(ActionBox)`
  border-right: 1px solid ${({ theme }) => theme.colors.primary200};

  svg {
    width: 1.2rem;
    height: 1.2rem;
  }
`;

const FieldContainer = styled<FlexComponent>(Flex)<{ $isSibling: boolean }>`
  border: 1px solid
    ${({ theme, $isSibling }) => ($isSibling ? theme.colors.neutral150 : theme.colors.primary200)};

  svg {
    width: 1rem;
    height: 1rem;

    path {
      fill: ${({ theme, $isSibling }) => ($isSibling ? undefined : theme.colors.primary600)};
    }
  }
`;

export { CardDragPreview };
export type { CardDragPreviewProps };
