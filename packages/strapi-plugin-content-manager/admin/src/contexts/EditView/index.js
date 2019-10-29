import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const EditViewContext = createContext();

function EditViewProvider({ children, ...rest }) {
  return (
    <EditViewContext.Provider value={rest}>{children}</EditViewContext.Provider>
  );
}

function useEditView() {
  return useContext(EditViewContext);
}

EditViewProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

EditViewProvider.defaultProps = {
  addRelation: () => {},
  moveRelation: () => {},
  onChange: () => {},
  onRemove: () => {},
};

export { EditViewProvider, useEditView };
