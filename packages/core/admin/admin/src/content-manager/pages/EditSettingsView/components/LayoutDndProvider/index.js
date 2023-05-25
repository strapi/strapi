import React from 'react';
import PropTypes from 'prop-types';

export const LayoutDndContext = React.createContext();

export function LayoutDndProvider({
  attributes,
  buttonData,
  children,
  goTo,
  layout,
  metadatas,
  moveItem,
  moveRow,
  onAddData,
  relationsLayout,
  removeField,
  selectedItemName,
  setEditFieldToSelect,
  ...rest
}) {
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
        selectedItemName,
        setEditFieldToSelect,
        ...rest,
      }}
    >
      {children}
    </LayoutDndContext.Provider>
  );
}

LayoutDndProvider.defaultProps = {
  attributes: {},
  buttonData: [],
  goTo() {},
  layout: [],
  metadatas: {},
  moveItem() {},
  moveRow() {},
  onAddData() {},
  relationsLayout: [],
  removeField() {},
  selectedItemName: null,
  setEditFieldToSelect() {},
};

LayoutDndProvider.propTypes = {
  attributes: PropTypes.object,
  buttonData: PropTypes.array,
  children: PropTypes.node.isRequired,
  goTo: PropTypes.func,
  layout: PropTypes.array,
  metadatas: PropTypes.object,
  moveItem: PropTypes.func,
  moveRow: PropTypes.func,
  onAddData: PropTypes.func,
  relationsLayout: PropTypes.array,
  removeField: PropTypes.func,
  selectedItemName: PropTypes.string,
  setEditFieldToSelect: PropTypes.func,
};
