import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const LayoutDndContext = createContext();

export function LayoutDndProvider({
  attributes,
  buttonData,
  children,
  layout,
  moveItem,
  moveRow,
  onAddData,
  removeField,
}) {
  return (
    <LayoutDndContext.Provider
      value={{
        attributes,
        buttonData,
        layout,
        moveItem,
        moveRow,
        onAddData,
        removeField,
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
  layout: [],
  onAddData: () => {},
};

LayoutDndProvider.propTypes = {
  attributes: PropTypes.object,
  buttonData: PropTypes.array,
  children: PropTypes.node.isRequired,
  layout: PropTypes.array,
  moveItem: PropTypes.func.isRequired,
  moveRow: PropTypes.func.isRequired,
  onAddData: PropTypes.func,
  removeField: PropTypes.func.isRequired,
};
