import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const EditPageContext = createContext({});

const EditPageContextProvider = ({ children, ...rest }) => {
  return <EditPageContext.Provider value={rest}>{children}</EditPageContext.Provider>;
};

const useEditPageContext = () => useContext(EditPageContext);

EditPageContextProvider.defaultProps = {
  emitEvent: () => {},
};

EditPageContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
  emitEvent: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  selectAllActions: PropTypes.func.isRequired,
  setInputPoliciesPath: PropTypes.func.isRequired,
  setShouldDisplayPolicieshint: PropTypes.func.isRequired,
  resetShouldDisplayPoliciesHint: PropTypes.func.isRequired,
};

export { EditPageContext, EditPageContextProvider, useEditPageContext };
