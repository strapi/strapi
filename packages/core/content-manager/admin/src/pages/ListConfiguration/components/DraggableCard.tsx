import * as React from 'react';

import {
  Box,
  BoxComponent,
  Flex,
  FlexComponent,
  Modal,
  Typography,
  useComposedRefs,
} from '@strapi/design-system';
import { Cross, Drag, Pencil } from '@strapi/icons';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { CardDragPreview } from '../../../components/DragPreviews/CardDragPreview';
import { ItemTypes } from '../../../constants/dragAndDrop';
import { useDragAndDrop } from '../../../hooks/useDragAndDrop';
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

  const composedRefs = useComposedRefs<HTMLButtonElement>(
    dropRef,
    objectRef as React.RefObject<HTMLButtonElement>
  );

  return (
    <FieldWrapper ref={composedRefs}>
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
              ref={dragRef}
              aria-label={formatMessage(
                {
                  id: getTranslation('components.DraggableCard.move.field'),
                  defaultMessage: 'Move {item}',
                },
                { item: label }
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Drag />
            </DragButton>
            <Typography fontWeight="bold">{label}</Typography>
          </Flex>
          <Flex paddingLeft={3} onClick={(e) => e.stopPropagation()}>
            <Modal.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
              <Modal.Trigger>
                <ActionButton
                  onClick={(e) => {
                    e.stopPropagation();
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
                  <Pencil width="1.2rem" height="1.2rem" />
                </ActionButton>
              </Modal.Trigger>
              <EditFieldForm
                attribute={attribute}
                name={`layout.${index}`}
                onClose={() => {
                  setIsModalOpen(false);
                }}
              />
            </Modal.Root>
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
              <Cross width="1.2rem" height="1.2rem" />
            </ActionButton>
          </Flex>
        </FieldContainer>
      )}
    </FieldWrapper>
  );
};

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  height: ${({ theme }) => theme.spaces[7]};
  color: ${({ theme }) => theme.colors.neutral600};

  &:hover {
    color: ${({ theme }) => theme.colors.neutral700};
  }

  &:last-child {
    padding: 0 ${({ theme }) => theme.spaces[3]};
  }
`;

const DragButton = styled(ActionButton)`
  padding: 0 ${({ theme }) => theme.spaces[3]};
  border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
  cursor: all-scroll;
`;

const FieldContainer = styled<FlexComponent>(Flex)`
  max-height: 3.2rem;
  cursor: pointer;
`;

const FieldWrapper = styled<BoxComponent>(Box)`
  &:last-child {
    padding-right: ${({ theme }) => theme.spaces[3]};
  }
`;

export { DraggableCard };
export type { DraggableCardProps };
