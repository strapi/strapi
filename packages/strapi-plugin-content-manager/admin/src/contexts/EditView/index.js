import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const EditViewContext = createContext();

export function EditViewProvider({ children, ...rest }) {
  return (
    <EditViewContext.Provider value={rest}>{children}</EditViewContext.Provider>
  );
}

export function useEditView() {
  return useContext(EditViewContext);
}

EditViewProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
