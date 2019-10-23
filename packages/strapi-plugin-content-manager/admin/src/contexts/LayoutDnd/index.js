import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const LayoutDndContext = createContext();

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

export function useLayoutDnd() {
  return useContext(LayoutDndContext);
}

LayoutDndProvider.defaultProps = {
  attributes: {},
  buttonData: [],
  goTo: () => {},
  layout: [],
  metadatas: {},
  onAddData: () => {},
  relationsLayout: [],
  setEditFieldToSelect: () => {},
};

LayoutDndProvider.propTypes = {
  attributes: PropTypes.object,
  buttonData: PropTypes.array,
  children: PropTypes.node.isRequired,
  goTo: PropTypes.func,
  layout: PropTypes.array,
  metadatas: PropTypes.object,
  moveItem: PropTypes.func.isRequired,
  moveRow: PropTypes.func.isRequired,
  onAddData: PropTypes.func,
  relationsLayout: PropTypes.array,
  removeField: PropTypes.func.isRequired,
  selectedItemName: PropTypes.string.isRequired,
  setEditFieldToSelect: PropTypes.func,
};
