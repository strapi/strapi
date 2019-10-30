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
  // addRelation: PropTypes.func,
  children: PropTypes.node.isRequired,
  // didCheckErrors: PropTypes.bool,
  // errors: PropTypes.object,
  layout: PropTypes.object,
  // moveRelation: PropTypes.func,
  // onRemove: PropTypes.func,
  // onChange: PropTypes.func,
};

EditViewProvider.defaultProps = {
  // addRelation: () => {},
  // didCheckErrors: false,
  // errors: {},
  layout: {},
  // modifiedData: {},
  // moveRelation: () => {},
  // onChange: () => {},
  // onRemove: () => {},
};

export { EditViewProvider, useEditView };
