import { Flex, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import { Cross, Drag, Pencil } from '@strapi/icons';
import styled from 'styled-components';

interface CardDragPreviewProps {
  labelField: string;
  isSibling?: boolean;
}

const CardDragPreview = ({ labelField, isSibling = false }: CardDragPreviewProps) => {
  return (
    <FieldContainer
      background={isSibling ? 'neutral100' : 'primary100'}
      display="inline-flex"
      gap={3}
      hasRadius
      justifyContent="space-between"
      isSibling={isSibling}
      max-height={pxToRem(32)}
      maxWidth="min-content"
    >
      <Flex gap={3}>
        <DragButton alignItems="center" cursor="all-scroll" padding={3}>
          <Drag />
        </DragButton>

        <TypographyMaxWidth
          textColor={isSibling ? undefined : 'primary600'}
          fontWeight="bold"
          ellipsis
        >
          {labelField}
        </TypographyMaxWidth>
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

const ActionBox = styled(Flex)`
  height: ${({ theme }) => theme.spaces[7]};

  &:last-child {
    padding: 0 ${({ theme }) => theme.spaces[3]};
  }
`;

const DragButton = styled(ActionBox)`
  border-right: 1px solid ${({ theme }) => theme.colors.primary200};

  svg {
    width: ${12 / 16}rem;
    height: ${12 / 16}rem;
  }
`;

const FieldContainer = styled(Flex)<{ isSibling: boolean }>`
  border: 1px solid
    ${({ theme, isSibling }) => (isSibling ? theme.colors.neutral150 : theme.colors.primary200)};

  svg {
    width: ${10 / 16}rem;
    height: ${10 / 16}rem;

    path {
      fill: ${({ theme, isSibling }) => (isSibling ? undefined : theme.colors.primary600)};
    }
  }
`;

const TypographyMaxWidth = styled(Typography)`
  max-width: ${72 / 16}rem;
`;

export { CardDragPreview };
export type { CardDragPreviewProps };
