import { useState } from 'react';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { tours } from '@strapi/admin/strapi-admin';
import { Box, Button, EmptyStateLayout } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { createPortal } from 'react-dom';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTrad } from '../utils/getTrad';

import { AttributeRow, type AttributeRowProps } from './AttributeRow';
import { useCTBTracking } from './CTBSession/ctbSession';
import { useDataManager } from './DataManager/useDataManager';
import { NestedTFooter, TFooter } from './Footers';
import { useFormModalNavigation } from './FormModalNavigation/useFormModalNavigation';

import type { Component, ContentType } from '../types';
import type { UID } from '@strapi/types';

export const ListGrid = styled(Box)`
  white-space: nowrap;
  list-style: none;
  list-style-type: none;
`;

type ListProps = {
  addComponentToDZ?: () => void;
  firstLoopComponentUid?: UID.Component | null;
  isFromDynamicZone?: boolean;
  isMain?: boolean;
  secondLoopComponentUid?: UID.Component | null;
  isSub?: boolean;
  type: ContentType | Component;
};

const SortableRow = (props: AttributeRowProps) => {
  const { isInDevelopmentMode } = useDataManager();

  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    setActivatorNodeRef,
  } = useSortable({
    disabled:
      !isInDevelopmentMode || props.item.status === 'REMOVED' || props.type.status === 'REMOVED',
    id: props.item.id,
    data: { index: props.item.index },
  });

  const style = {
    transform: CSS.Transform.toString({
      x: transform?.x ?? 0,
      y: transform?.y ?? 0,
      scaleX: 1,
      scaleY: 1,
    }),
    transition,
  };

  return (
    <AttributeRow
      ref={setNodeRef}
      handleRef={setActivatorNodeRef}
      isDragging={isDragging}
      attributes={attributes}
      listeners={listeners}
      style={style}
      {...props}
    />
  );
};

export const List = ({
  addComponentToDZ,
  firstLoopComponentUid,
  isFromDynamicZone = false,
  isMain = false,
  isSub = false,
  secondLoopComponentUid,
  type,
}: ListProps) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useCTBTracking();
  const { isInDevelopmentMode, moveAttribute } = useDataManager();
  const { onOpenModalAddField } = useFormModalNavigation();

  const items = type?.attributes.map((item, index) => {
    return {
      id: `${type.uid}_${item.name}`,
      index,
      ...item,
    };
  });

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const isDeleted = type?.status === 'REMOVED';

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handlerDragStart({ active }: DragStartEvent) {
    if (!active) {
      return;
    }

    setActiveId(active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveId(null);

    if (over) {
      if (active.id !== over.id) {
        moveAttribute({
          forTarget: type.modelType,
          targetUid: type.uid,
          from: active.data.current!.index,
          to: over.data.current!.index,
        });
      }
    }
  }

  const activeItem = items.find((item) => item.id === activeId);

  const onClickAddField = () => {
    if (isDeleted) {
      return;
    }

    trackUsage('hasClickedCTBAddFieldBanner');

    onOpenModalAddField({ forTarget: type?.modelType, targetUid: type.uid });
  };

  if (type?.attributes.length === 0 && isMain) {
    return (
      <EmptyStateLayout
        action={
          <tours.contentTypeBuilder.AddFields>
            <Button onClick={onClickAddField} size="L" startIcon={<Plus />} variant="secondary">
              {formatMessage({
                id: getTrad('table.button.no-fields'),
                defaultMessage: 'Add new field',
              })}
            </Button>
          </tours.contentTypeBuilder.AddFields>
        }
        content={formatMessage(
          type.modelType === 'contentType'
            ? {
                id: getTrad('table.content.no-fields.collection-type'),
                defaultMessage: 'Add your first field to this Collection-Type',
              }
            : {
                id: getTrad('table.content.no-fields.component'),
                defaultMessage: 'Add your first field to this component',
              }
        )}
        hasRadius
        icon={<EmptyDocuments width="16rem" />}
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragStart={handlerDragStart}
      onDragCancel={() => setActiveId(null)}
      modifiers={[restrictToVerticalAxis]}
    >
      <ListGrid tag="ul">
        {createPortal(
          <DragOverlay zIndex={10}>
            {activeItem && (
              <AttributeRow
                isOverlay
                item={activeItem}
                firstLoopComponentUid={firstLoopComponentUid}
                isFromDynamicZone={isFromDynamicZone}
                secondLoopComponentUid={secondLoopComponentUid}
                type={type}
                addComponentToDZ={addComponentToDZ}
              />
            )}
          </DragOverlay>,
          document.body
        )}
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {items.map((item) => {
            return (
              <SortableRow
                key={item.id}
                item={item}
                firstLoopComponentUid={firstLoopComponentUid}
                isFromDynamicZone={isFromDynamicZone}
                secondLoopComponentUid={secondLoopComponentUid}
                type={type}
                addComponentToDZ={addComponentToDZ}
              />
            );
          })}
        </SortableContext>
      </ListGrid>

      {isMain && isInDevelopmentMode && (
        <TFooter
          cursor={isDeleted ? 'normal' : 'pointer'}
          icon={<Plus />}
          onClick={onClickAddField}
          color={isDeleted ? 'neutral' : 'primary'}
        >
          {formatMessage({
            id: getTrad(
              `form.button.add.field.to.${type.modelType === 'component' ? 'component' : type.kind}`
            ),
            defaultMessage: 'Add another field',
          })}
        </TFooter>
      )}
      {isSub && isInDevelopmentMode && (
        <NestedTFooter
          cursor={isDeleted ? 'normal' : 'pointer'}
          icon={<Plus />}
          onClick={onClickAddField}
          color={isFromDynamicZone && !isDeleted ? 'primary' : 'neutral'}
        >
          {formatMessage({
            id: getTrad(`form.button.add.field.to.component`),
            defaultMessage: 'Add another field',
          })}
        </NestedTFooter>
      )}
    </DndContext>
  );
};
