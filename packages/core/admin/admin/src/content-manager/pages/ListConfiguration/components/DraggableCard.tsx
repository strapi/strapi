import * as React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { Cross, Drag, Pencil } from '@strapi/icons';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { CardDragPreview } from '../../../components/DragPreviews/CardDragPreview';
import { useDragAndDrop } from '../../../hooks/useDragAndDrop';
import { ItemTypes } from '../../../utils/dragAndDrop';
import { useComposedRefs } from '../../../utils/refs';
import { getTranslation } from '../../../utils/translations';

import { EditFieldForm } from './EditFieldForm';

import type { ListFieldLayout } from '../../../hooks/useDocumentLayout';

type DraggableCardProps = Omit<ListFieldLayout, 'label'> & {
  label: string;
  index: number;
  isDraggingSibling: boolean;
  onMoveField: (dragIndex: number, hoverIndex: number) => void;
  onRemoveField: () => void;
  setIsDraggingSibling: (isDragging: boolean) => void;
};

const DraggableCard = ({
  attribute,
  index,
  isDraggingSibling,
  label,
  name,
  onMoveField,
  onRemoveField,
  setIsDraggingSibling,
}: DraggableCardProps) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const { formatMessage } = useIntl();
  const [, forceRerenderAfterDnd] = React.useState(false);

  const [{ isDragging }, objectRef, dropRef, dragRef, dragPreviewRef] = useDragAndDrop(true, {
    type: ItemTypes.FIELD,
    item: { index, label, name },
    index,
    onMoveItem: onMoveField,
    onEnd: () => setIsDraggingSibling(false),
  });

  React.useEffect(() => {
    dragPreviewRef(getEmptyImage(), { captureDraggingState: false });
  }, [dragPreviewRef]);

  React.useEffect(() => {
    if (isDragging) {
      setIsDraggingSibling(true);
    }
  }, [isDragging, setIsDraggingSibling]);

  // Effect in order to force a rerender after reordering the components
  // Since we are removing the Accordion when doing the DnD  we are losing the dragRef, therefore the replaced element cannot be dragged
  // anymore, this hack forces a rerender in order to apply the dragRef
  React.useEffect(() => {
    if (!isDraggingSibling) {
      forceRerenderAfterDnd((prev) => !prev);
    }
  }, [isDraggingSibling]);

  const composedRefs = useComposedRefs<HTMLSpanElement>(dragRef, objectRef);

  return (
    <FieldWrapper ref={dropRef}>
      {isDragging && <CardDragPreview label={label} />}
      {!isDragging && isDraggingSibling && <CardDragPreview isSibling label={label} />}

      {!isDragging && !isDraggingSibling && (
        <FieldContainer
          borderColor="neutral150"
          background="neutral100"
          hasRadius
          justifyContent="space-between"
          onClick={() => setIsModalOpen(true)}
        >
          <Flex gap={3}>
            <DragButton
              as="span"
              aria-label={formatMessage(
                {
                  id: getTranslation('components.DraggableCard.move.field'),
                  defaultMessage: 'Move {item}',
                },
                { item: label }
              )}
              onClick={(e) => e.stopPropagation()}
              ref={composedRefs}
            >
              <Drag />
            </DragButton>
            <Typography fontWeight="bold">{label}</Typography>
          </Flex>
          <Flex paddingLeft={3}>
            <ActionButton
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              aria-label={formatMessage(
                {
                  id: getTranslation('components.DraggableCard.edit.field'),
                  defaultMessage: 'Edit {item}',
                },
                { item: label }
              )}
              type="button"
            >
              <Pencil />
            </ActionButton>
            <ActionButton
              onClick={onRemoveField}
              data-testid={`delete-${name}`}
              aria-label={formatMessage(
                {
                  id: getTranslation('components.DraggableCard.delete.field'),
                  defaultMessage: 'Delete {item}',
                },
                { item: label }
              )}
              type="button"
            >
              <Cross />
            </ActionButton>
          </Flex>
        </FieldContainer>
      )}
      {isModalOpen && (
        <EditFieldForm
          attribute={attribute}
          name={`layout.${index}`}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </FieldWrapper>
  );
};

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  height: ${({ theme }) => theme.spaces[7]};

  &:last-child {
    padding: 0 ${({ theme }) => theme.spaces[3]};
  }
`;

const DragButton = styled(ActionButton)`
  padding: 0 ${({ theme }) => theme.spaces[3]};
  border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
  cursor: all-scroll;

  svg {
    width: ${12 / 16}rem;
    height: ${12 / 16}rem;
  }
`;

const FieldContainer = styled(Flex)`
  max-height: ${32 / 16}rem;
  cursor: pointer;

  svg {
    width: ${10 / 16}rem;
    height: ${10 / 16}rem;

    path {
      fill: ${({ theme }) => theme.colors.neutral600};
    }
  }

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary100};
    border-color: ${({ theme }) => theme.colors.primary200};

    svg {
      path {
        fill: ${({ theme }) => theme.colors.primary600};
      }
    }

    ${Typography} {
      color: ${({ theme }) => theme.colors.primary600};
    }

    ${DragButton} {
      border-right: 1px solid ${({ theme }) => theme.colors.primary200};
    }
  }
`;

const FieldWrapper = styled(Box)`
  &:last-child {
    padding-right: ${({ theme }) => theme.spaces[3]};
  }
`;

export { DraggableCard };
export type { DraggableCardProps };
