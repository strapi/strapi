import React from 'react';
import PropTypes from 'prop-types';

import InputModalStepper from './InputModalStepper';
import InputModalStepperProvider from '../InputModalStepperProvider';

const ModalStepper = ({ isOpen, onToggle, onInputMediaChange, multiple }) => {
  return (
    <InputModalStepperProvider multiple={multiple} isOpen={isOpen}>
      <InputModalStepper
        isOpen={isOpen}
        onToggle={onToggle}
        onInputMediaChange={onInputMediaChange}
      />
    </InputModalStepperProvider>
  );
};

ModalStepper.defaultProps = {
  onInputMediaChange: () => {},
  onToggle: () => {},
};

ModalStepper.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  multiple: PropTypes.bool.isRequired,
  onInputMediaChange: PropTypes.func,
  onToggle: PropTypes.func,
};

export default ModalStepper;
