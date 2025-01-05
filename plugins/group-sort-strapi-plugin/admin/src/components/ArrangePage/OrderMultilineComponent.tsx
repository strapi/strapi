import { Active, CollisionDetection, DndContext, DragEndEvent, DragOverEvent, DroppableContainer, KeyboardSensor, MeasuringStrategy, Modifiers, Over, PointerSensor, UniqueIdentifier, closestCenter, getFirstCollision, pointerWithin, rectIntersection, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { Box, Button, Flex, Grid, IconButton, StrapiTheme, Typography } from '@strapi/design-system';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { SortableItem } from './SortableItem';
import { ItemsDictionary } from '../../types';
import { GroupAndArrangeContext } from '../GroupAndArrangeContextProvider';
import { MultilinePosition } from '../../../../shared/contracts';
import { max, min, over } from 'lodash';
import { useTranslation } from '../../hooks/useTranslation';
import styled, { useTheme } from 'styled-components';
import { ArrowDown, ArrowUp, Trash } from '@strapi/icons';

export interface Order1dComponentProps {
  itemsDictionary: ItemsDictionary;
  setIsModified: (isModified: boolean) => void;
  setLayoutMultiline: (layout: Record<string, string[]>) => void;
}

const StyledFlex = styled(Flex)`
  width: 100%;
  min-height: ${({ theme }) => (theme as StrapiTheme).spaces[7]};
  margin-top: ${({ theme }) => (theme as StrapiTheme).spaces[4]};
  margin-bottom: ${({ theme }) => (theme as StrapiTheme).spaces[4]};
  padding: ${({ theme }) => (theme as StrapiTheme).spaces[2]};
  background-color: ${({ theme }) => (theme as StrapiTheme).colors.neutral200};
  text-align: left;

  & > div {
    width: 100%;
  }
`;

function DroppableContainer(props: {
  children: React.ReactNode,
  disabled?: boolean,
  id: string,
  items: string[],
  title: string,
  isFixed: boolean,
  canMoveUp?: boolean,
  canMoveDown?: boolean,
  onRemove?: () => void,
  onMoveUp?: () => void,
  onMoveDown?: () => void,
}) {
  const { formatMessage } = useTranslation();
  const theme = useTheme() as StrapiTheme;
  const { children, disabled, id, items, title, isFixed, canMoveUp, canMoveDown, onRemove, onMoveUp, onMoveDown } = props;
  const { setNodeRef } = useSortable({ id, data: { type: 'container', children: items } });
  return (
    <StyledFlex ref={disabled ? undefined : setNodeRef} direction='column'>
      <Flex style={{ marginBottom: theme.spaces[2] }} direction='row' gap={2}>
        {!isFixed && <>     
          <IconButton disabled={!canMoveUp}
            label={formatMessage({
              id: 'arrange.multiline-component.move-up',
              defaultMessage: 'Move up'
            })}
            onClick={onMoveUp}>
            <ArrowUp />
          </IconButton>
          <IconButton disabled={!canMoveDown}
            label={formatMessage({
              id: 'arrange.multiline-component.move-down',
              defaultMessage: 'Move down'
            })}
            onClick={onMoveDown}>
            <ArrowDown />
          </IconButton>
          <IconButton label={formatMessage({
              id: 'arrange.multiline-component.remove-line',
              defaultMessage: 'Remove line' })
            }
            onClick={onRemove}>
            <Trash />
          </IconButton>
        </>}
        <Typography variant='omega'>
          {title}
        </Typography>
      </Flex>
      <Box style={{ width: '100%' }}>
        {children}
      </Box>
    </StyledFlex>
  );
}

const OrderMultilineComponent = (props: Order1dComponentProps) => {
  const { formatMessage } = useTranslation();
  const theme = useTheme() as StrapiTheme;
  const { itemsDictionary, setIsModified, setLayoutMultiline } = props;
  const {
    currentAttribute,
    chosenMediaField,
    chosenTitleField,
    chosenSubtitleField,
    localConfig,
    groupField
  } = useContext(GroupAndArrangeContext);

  const [itemsPerContainer, setItemsPerContainer] = useState<Record<string, string[]>>({});
  useEffect(() => {
    setLayoutMultiline(itemsPerContainer);
  }, [itemsPerContainer]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function processDragEvent(event: {
    active: Active,
    over: Over | null,
    setItemsPerContainer: (items: Record<string, string[]>) => void,
    setIsModified: (isModified: boolean) => void,
    disableForSameContainer?: boolean,
  }) {
    if (!event.over) {
      return;
    }

    const activeContainerId = event.active.data.current?.sortable.containerId as UniqueIdentifier;
    let overContainerId = event.over?.data.current?.sortable.containerId as UniqueIdentifier;
    if (overContainerId === 'Sortable' && event.over?.data.current?.type === "container") {
      overContainerId = event.over.id;
    }
    if(overContainerId === 'temporary') {
      if(event.over?.data.current?.type === "container") {
        overContainerId = event.over.id;
      }
      else {
        overContainerId = '0';
      }
    }

    const isSameContainer = activeContainerId === overContainerId;
    if (event.disableForSameContainer && isSameContainer) {
      return;
    }

    setItemsPerContainer((items) => {
      const activeContainer = items[activeContainerId];
      const overContainer = items[overContainerId];
      if (!activeContainer || !overContainer) {
        return items;
      }

      const activeIndex = activeContainer.indexOf(event.active.id as string);
      let overIndex = overContainer.indexOf(event.over?.id as string);
      if (activeIndex === -1) {
        return items;
      }
      if (overIndex === -1) {
        overIndex = overContainer.length;
      }

      const activeItems = [...activeContainer];
      const overItems = isSameContainer ? activeItems : [...overContainer];

      const removed = activeItems.splice(activeIndex, 1);
      overItems.splice(overIndex, 0, ...removed);

      const result = {
        ...items,
        [activeContainerId]: activeItems,
      };
      if (!isSameContainer) {
        result[overContainerId] = overItems;
      }
      return result;
    });
    setIsModified(true);
  }

  const handleMoveLine = useCallback((line: string, direction: 'up' | 'down') => {
    setItemsPerContainer((items) => {
      const newItems = { ...items };
      const swapLineOther = direction === 'up' ? (parseInt(line) - 1).toString() : (parseInt(line) + 1).toString();
      const swapLine = newItems[swapLineOther];
      if (!swapLine) {
        return items;
      }
      const lineItems = newItems[line];
      newItems[line] = swapLine;
      newItems[swapLineOther] = lineItems;
      return newItems;
    });
    setIsModified(true);
  }, [setIsModified, setItemsPerContainer]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    processDragEvent({
      active: event.active,
      over: event.over,
      setItemsPerContainer,
      setIsModified,
      disableForSameContainer: true,
    });
  }, [setIsModified, setItemsPerContainer]);

  const handleDragEnd = useCallback((event: DragEndEvent): void => {
    processDragEvent({
      active: event.active,
      over: event.over,
      setItemsPerContainer,
      setIsModified,
    });
  }, [setIsModified, setItemsPerContainer]);

  const handleAddLine = useCallback(() => {
    setItemsPerContainer((items) => {
      const newItems = { ...items };
      newItems[Object.keys(items).length] = [];
      return newItems;
    });
    // do not set modified because lines without items are not saved
  }, [setItemsPerContainer]);

  const handleRemoveLine = useCallback((lineToDelete: string) => {
    const itemsCount = itemsPerContainer[lineToDelete].length;
    const confirmed = window.confirm(formatMessage({
      id: 'arrange.multiline-component.remove-line-confirm',
      defaultMessage: 'Are you sure you want to remove line {line, number} with {items, plural, one {1 item} other {{items, number} items}}?',
    }, { line: lineToDelete, items: itemsCount }));
    if (!confirmed) {
      return;
    }

    setItemsPerContainer((items) => {
      var newItems = { ...items };

      newItems[0] = [...newItems[0], ...newItems[lineToDelete]];
      delete newItems[lineToDelete];

      // remove gaps in line numbers, excluding 0:
      const lines = Object.keys(newItems).filter(x => x !== '0');
      const lineNumbers = Array.from(new Set(lines)).sort();
      const lineNumbersMap = lineNumbers.reduce((acc, x, i) => {
        acc[x] = (i + 1).toString();
        return acc;
      }, {} as Record<string, string>);
      Object.keys(newItems).filter(x => x !== '0').forEach(x => {
        const newIndex = lineNumbersMap[x];
        newItems[lineNumbersMap[x]] = newItems[x];
        if (x !== newIndex) {
          delete newItems[x];
        }
      });

      return newItems;
    });
    setIsModified(true);
  }, [itemsPerContainer, setIsModified, setItemsPerContainer]);

  useEffect(() => {
    // Prepare sortables for 1-dimensional list.
    // Items that does not have order yet will be placed at the end of the list.
    const sortables: { order: MultilinePosition, documentId: string }[] = Object.values(itemsDictionary)
      .reduce((acc: { order: MultilinePosition, documentId: string }[], item, i) => {
        const order: MultilinePosition = item[groupField!] === undefined || item[groupField!] === null ? { row: 0, column: 0 } : item[groupField!];
        acc.push({ order: order || null, documentId: item.documentId });
        return acc;
      }, [] as { order: MultilinePosition, documentId: string }[])
      .sort((a,b) => a.order.column - b.order.column) || [];

    let maxRow = 0;
    const itemsPerContainer = sortables
      .reduce((acc, x) => {
        if (!acc[x.order.row]) {
          acc[x.order.row] = [];
        }
        maxRow = Math.max(maxRow, x.order.row);
        acc[x.order.row].push(x.documentId);
        return acc;
      }, {} as Record<string, string[]>);
    for(let i = 0; i <= maxRow; i++) {
      if (!itemsPerContainer[i]) {
        itemsPerContainer[i] = [];
      }
    }
    setItemsPerContainer(itemsPerContainer);
  }, [currentAttribute, itemsDictionary]);


  const unsortedItems = (
    <DroppableContainer
      key={'0'}
      id={'0'}
      items={itemsPerContainer[0]}
      title={formatMessage({
        id: 'arrange.multiline-component.line-header.unsorted-items',
        defaultMessage: 'Unsorted items'
      })}
      isFixed={true}
    >
      <Grid.Root gap={2} gridCols={localConfig?.multilineUnsortedColumns} style={{ position: 'sticky' }}>
        <SortableContext
          id='0'
          items={itemsPerContainer[0] || []}
          strategy={rectSortingStrategy}
        >
          {(itemsPerContainer[0] || []).map(x => itemsDictionary[x]).filter(x => x).map(i =>
            <Grid.Item key={i.documentId} col={1} m={1}>
              <SortableItem
                id={i.documentId}
                title={chosenTitleField && i.titlesByTitleFields[chosenTitleField]}
                subtitle={chosenSubtitleField && i.titlesByTitleFields[chosenSubtitleField]}
                thumbnailUri={chosenMediaField && i.thumbnailUrisByMediaFields[chosenMediaField]}
                heightRem={localConfig?.rowHeightMultilineRem}
                resizable={false} />
            </Grid.Item>
          )}
        </SortableContext>
      </Grid.Root>
    </DroppableContainer>
  );

  return (
    <Box>
      <DndContext
        sensors={sensors}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always
          }
        }}
        //collisionDetection={pointerWithin}
        collisionDetection={rectIntersection}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <SortableContext id='temporary' items={[]}>
          {localConfig?.multilineShowUnsortedOnTop && unsortedItems}
          {Object.keys(itemsPerContainer).filter(x => x !== '0').map((line) => (
            <DroppableContainer
              key={line}
              id={line}
              items={itemsPerContainer[line]}
              title={formatMessage({
                id: 'arrange.multiline-component.line-header.line-number-fmt',
                defaultMessage: 'Line {line, number}',
              }, { line: line })}
              isFixed={false}
              canMoveUp={line !== '1'}
              canMoveDown={line !== Object.keys(itemsPerContainer).sort().pop()}
              onRemove={() => handleRemoveLine(line)}
              onMoveUp={() => handleMoveLine(line, 'up')}
              onMoveDown={() => handleMoveLine(line, 'down')}
            >
              <SortableContext
                id={line}
                items={itemsPerContainer[line]}
                strategy={rectSortingStrategy}
              >
                <Flex gap={2}>
                  {!itemsPerContainer[line].length &&
                    <Typography variant='omega'>
                      {formatMessage({
                        id: 'arrange.multiline-component.no-items',
                        defaultMessage: 'No items in this line'
                      })}
                    </Typography>
                  }
                  {itemsPerContainer[line].map(x => itemsDictionary[x]).filter(x => x).map(i =>
                    <Box key={i.documentId} flex={1}>
                      <SortableItem
                        id={i.documentId}
                        title={chosenTitleField && i.titlesByTitleFields[chosenTitleField]}
                        subtitle={chosenSubtitleField && i.titlesByTitleFields[chosenSubtitleField]}
                        thumbnailUri={chosenMediaField && i.thumbnailUrisByMediaFields[chosenMediaField]}
                        heightRem={localConfig?.rowHeightMultilineRem}
                        resizable={false} />
                    </Box>
                  )}
                </Flex>
              </SortableContext>
            </DroppableContainer>
          ))}
          <Button
            onClick={handleAddLine}
            style={{ marginTop: theme.spaces[4] }}
          >
            {formatMessage({
              id: 'arrange.multiline-component.add-line',
              defaultMessage: 'Add line',
            })}

          </Button>
          {!localConfig?.multilineShowUnsortedOnTop && unsortedItems}
        </SortableContext>
      </DndContext>
    </Box>
  );
};

export default OrderMultilineComponent;