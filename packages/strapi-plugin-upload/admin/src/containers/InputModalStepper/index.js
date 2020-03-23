import React from 'react';
import PropTypes from 'prop-types';

import InputModalStepper from './InputModalStepper';
import InputModalStepperProvider from '../InputModalStepperProvider';

const ModalStepper = ({ isOpen, onToggle, onChange, multiple }) => {
  return (
    <InputModalStepperProvider multiple={multiple} isOpen={isOpen}>
      <InputModalStepper isOpen={isOpen} onToggle={onToggle} onChange={onChange} />
    </InputModalStepperProvider>
  );
};

ModalStepper.defaultProps = {
  onChange: () => {},
  onToggle: () => {},
};

ModalStepper.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  multiple: PropTypes.bool.isRequired,
  onChange: PropTypes.func,
  onToggle: PropTypes.func,
};

export default ModalStepper;
