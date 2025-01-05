import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Grid } from '@strapi/design-system';
import { useContext, useEffect, useState } from 'react';
import { SortableItem } from './SortableItem';
import { ItemsDictionary } from '../../types';
import { GroupAndArrangeContext } from '../GroupAndArrangeContextProvider';

export interface Order1dComponentProps {
  itemsDictionary: ItemsDictionary;
  setIsModified: (isModified: boolean) => void;
  setLayout1d: (layout: string[]) => void;
}

const Order1dComponent = (props: Order1dComponentProps) => {
  const {itemsDictionary, setIsModified, setLayout1d: setLayout1dExt} = props;
  const {
    currentAttribute,
    currentFieldSettings,
    chosenMediaField,
    chosenTitleField,
    chosenSubtitleField,
    groupField
  } = useContext(GroupAndArrangeContext);

  const [layout1d, setLayout1d] = useState([] as string[]);

  useEffect(() => {
    setLayout1dExt(layout1d);
  }, [layout1d]);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setLayout1d((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over?.id as string);

        setIsModified(true);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  useEffect(() => {
    // Prepare sortables for 1-dimensional list.
    // Items that does not have order yet will be placed at the end of the list.
    const sortables: {order: number, documentId: string}[] = Object.values(itemsDictionary)
      .reduce((acc: {order: number, documentId: string}[], item) => {
        const order = item[groupField!] === undefined || item[groupField!] === null ? acc.length - 1 : item[groupField!];
        acc.push({ order, documentId: item.documentId });
        return acc;
      }, []) || [];
    sortables.sort((a, b) => a.order - b.order);
    setLayout1d(sortables.map(x => x.documentId));
  }, [currentAttribute, itemsDictionary]);

  return (
    <Grid.Root gap={4} gridCols={currentFieldSettings?.columnsNumber} flex={1}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={layout1d}
          strategy={rectSortingStrategy}
        >
          {layout1d.map(x => itemsDictionary[x]).filter(x => x).map(i =>
            <Grid.Item key={i.documentId} col={1} m={1}>
              <SortableItem
                id={i.documentId}
                title={chosenTitleField && i.titlesByTitleFields[chosenTitleField]}
                subtitle={chosenSubtitleField && i.titlesByTitleFields[chosenSubtitleField]}
                thumbnailUri={chosenMediaField && i.thumbnailUrisByMediaFields[chosenMediaField]}
                resizable={false} />
            </Grid.Item>
          )}
        </SortableContext>
      </DndContext>
    </Grid.Root>
  );
};

export default Order1dComponent;