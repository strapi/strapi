import React, { useState } from 'react';
import PropTypes from 'prop-types';
import FormModalNavigationContext from '../../contexts/FormModalNavigationContext';
import { INITIAL_STATE_DATA } from './constants';

const FormModalNavigationProvider = ({ children }) => {
  const [state, setFormModalNavigationState] = useState(INITIAL_STATE_DATA);

  return (
    <FormModalNavigationContext.Provider value={{ ...state, setFormModalNavigationState }}>
      {children}
    </FormModalNavigationContext.Provider>
  );
};

FormModalNavigationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default FormModalNavigationProvider;
