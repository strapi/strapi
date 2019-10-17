import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const DraggedFieldContext = createContext();

export function DraggedFieldProvider({ children, ...rest }) {
  return (
    <DraggedFieldContext.Provider value={rest}>
      {children}
    </DraggedFieldContext.Provider>
  );
}

export function useDraggedField() {
  return useContext(DraggedFieldContext);
}

DraggedFieldProvider.propTypes = {
  children: PropTypes.node.isRequired,
  selectedItem: PropTypes.string,
};

DraggedFieldProvider.defaultProps = {
  selectedItem: '',
};
