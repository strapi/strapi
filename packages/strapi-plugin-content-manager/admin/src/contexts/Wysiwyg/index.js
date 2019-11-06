import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

export const WysiwygContext = createContext();

export function WysiwygProvider({ children, ...rest }) {
  return (
    <WysiwygContext.Provider value={rest}>{children}</WysiwygContext.Provider>
  );
}

export function useWysiwyg() {
  return useContext(WysiwygContext);
}

WysiwygProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
