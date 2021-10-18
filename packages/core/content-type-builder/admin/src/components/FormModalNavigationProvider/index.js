import React, { useState } from 'react';
import PropTypes from 'prop-types';
import FormModalNavigationContext from '../../contexts/FormModalNavigationContext';
import { INITIAL_STATE_DATA } from './constants';

const FormModalNavigationProvider = ({ children }) => {
  const [state, setFormModalNavigationState] = useState(INITIAL_STATE_DATA);

  const onOpenModal = nextState => {
    setFormModalNavigationState(prevState => {
      return { ...prevState, ...nextState, isOpen: true };
    });
  };

  const onCloseModal = () => {
    setFormModalNavigationState(INITIAL_STATE_DATA);
  };

  return (
    <FormModalNavigationContext.Provider
      value={{ ...state, onCloseModal, onOpenModal, setFormModalNavigationState }}
    >
      {children}
    </FormModalNavigationContext.Provider>
  );
};

FormModalNavigationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default FormModalNavigationProvider;
