import * as React from 'react';

interface LayoutDndProviderProps {
  attributes: any;
  buttonData: any[];
  goTo: () => void;
  layout: any[];
  metadatas: any;
  moveItem: () => void;
  moveRow: () => void;
  onAddData: () => void;
  relationsLayout: any[];
  removeField: () => void;
  selectedField?: string;
  setEditFieldToSelect: () => void;
  children?: React.ReactNode;
}

const LayoutDndContext = React.createContext<LayoutDndProviderProps>({
  attributes: {},
  buttonData: [],
  goTo: () => {},
  layout: [],
  metadatas: {},
  moveItem: () => {},
  moveRow: () => {},
  onAddData: () => {},
  relationsLayout: [],
  removeField: () => {},
  setEditFieldToSelect: () => {},
});

/*
isContentTypeView
attributes
modifiedData
slug
componentLayouts
selectedField
fieldForm
onMoveRelation
onMoveField
moveRow
moveItem
setEditFieldToSelect
isDraggingSibling
setIsDraggingSibling
*/

const LayoutDndProvider = ({
  attributes = {},
  buttonData = [],
  goTo = () => {},
  layout = [],
  metadatas = {},
  moveItem = () => {},
  moveRow = () => {},
  onAddData = () => {},
  relationsLayout = [],
  removeField = () => {},
  selectedField,
  setEditFieldToSelect = () => {},
  children,
  ...rest
}: LayoutDndProviderProps) => {
  return (
    <LayoutDndContext.Provider
      value={{
        attributes,
        buttonData,
        goTo,
        layout,
        metadatas,
        moveItem,
        moveRow,
        onAddData,
        relationsLayout,
        removeField,
        selectedField,
        setEditFieldToSelect,
        ...rest,
      }}
    >
      {children}
    </LayoutDndContext.Provider>
  );
};

export { LayoutDndContext, LayoutDndProvider };
