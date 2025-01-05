import GridLayout, { WidthProvider } from "react-grid-layout";
import { Box, Grid } from '@strapi/design-system';
import { useCallback, useContext, useEffect, useState } from 'react';
import { SortableItem } from './SortableItem';
import { ItemsDictionary } from '../../types';
import { GroupAndArrangeContext } from '../GroupAndArrangeContextProvider';
import withReactGridStyles from "../../pages/ArrangePage.Styles";
import { differenceWith, isEqual } from "lodash";

export interface Order2dComponentProps {
  itemsDictionary: ItemsDictionary;
  isModified: boolean;
  setIsModified: (isModified: boolean) => void;
  setLayout2d: (layout: GridLayout.Layout[]) => void;
}

const StyledResponsiveGridLayout = withReactGridStyles(WidthProvider(GridLayout));

const Order2dComponent = (props: Order2dComponentProps) => {
  const {itemsDictionary, isModified, setIsModified, setLayout2d: setLayout2dExt} = props;
  const {
    currentAttribute,
    currentFieldSettings,
    localConfig,
    chosenMediaField,
    chosenTitleField,
    chosenSubtitleField,
    chosenDirection,
    groupField
  } = useContext(GroupAndArrangeContext);

  const [layout2d, setLayout2d] = useState([] as GridLayout.Layout[]);

  useEffect(() => {
    setLayout2dExt(layout2d);
  }, [layout2d]);

  useEffect(() => {
    // Prepare layout2d for 2-dimensional grid.
    // Items that does not have order yet will be placed at the end of the grid starting from the last available coordinate.
    const sortables: {order: GridLayout.Layout | null, documentId: string}[] = 
      Object.values(itemsDictionary)
        .reduce((acc: {order: GridLayout.Layout | null, documentId: string}[], item) => {
          const order = item[groupField!];
          if (typeof order !== 'object' && order !== null && order !== undefined) {
            return null;
          }
          acc.push({ order: order || null, documentId: item.documentId });
          return acc;
        }, [])
        ?.filter((x: any) => x)
        .map((x: { order: GridLayout.Layout | null; documentId: string; }) => {
          // attach documetId since it is not part of the order object
          return { order: x.order && {...x.order, i: x.documentId} as GridLayout.Layout, documentId: x.documentId }
        }) || [];
    
    const resultingSortables = sortables?.filter(x => x.order && x.order.x !== undefined && x.order.y !== undefined && x.order.w !== undefined && x.order.h !== undefined).map(x => x.order as GridLayout.Layout);
    // sortables except resultingSortables
    const idsMissingOrder = sortables?.filter(x => !resultingSortables.some(y => y.i === x.documentId)).map(x => x.documentId);
    if(idsMissingOrder?.length > 0) {
      let lastPositionY = 0;
      resultingSortables.forEach(i => {
        lastPositionY = Math.max(lastPositionY, i.y + i.h);
      });
      for(let i = 0; i < idsMissingOrder.length; i++)
      {
        const id = idsMissingOrder[i];
        const y = Math.floor(i / (currentFieldSettings?.columnsNumber || 1));

        const layout: GridLayout.Layout = {
          i: id,
          x: 0,
          y: lastPositionY + y,
          w: 1,
          h: 1
        }
        resultingSortables.push(layout);
      }
    }
    setLayout2d(resultingSortables.map(x => ({
      ...x,
      // these are needed for checking whether changes were made in handleLayout2dChange:
      moved: false,
      static: false,
      isBounded: undefined,
      isDraggable: undefined,
      isResizable: undefined,
      maxH: undefined,
      maxW: undefined,
      minH: undefined,
      minW: undefined,
      resizeHandles: undefined
    })));
  }, [itemsDictionary, currentAttribute, currentFieldSettings]);

  function handleLayout2dChange(layout: GridLayout.Layout[]): void {
    if(!isModified) {
      const wasChanged = differenceWith(layout, layout2d, isEqual).length > 0;
      if (!wasChanged) {
        return;
      }
      setIsModified(true);
    }
    setLayout2d(layout.filter(x => x && x.i && x.x !== undefined));
  }

  return (
    <Box position="relative" width="100%">
      <StyledResponsiveGridLayout
        className="layout"
        layout={layout2d}
        onLayoutChange={handleLayout2dChange}
        cols={currentFieldSettings?.columnsNumber}
        rowHeight={localConfig?.rowHeight2d || 32}
        compactType={chosenDirection || null}
      >
        {layout2d.map(x => itemsDictionary[x.i]).filter(x => x).map(i =>
          <Grid.Item key={i.documentId} col={1} m={1}>
            <SortableItem
              id={i.documentId}
              title={chosenTitleField && i.titlesByTitleFields[chosenTitleField]}
              subtitle={chosenSubtitleField && i.titlesByTitleFields[chosenSubtitleField]}
              thumbnailUri={chosenMediaField && i.thumbnailUrisByMediaFields[chosenMediaField]}
              resizable={true} />
          </Grid.Item>
        )}
      </StyledResponsiveGridLayout>
    </Box>
  );
};

export default Order2dComponent;