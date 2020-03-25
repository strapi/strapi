import React from 'react';
import PropTypes from 'prop-types';

import InputModalStepper from './InputModalStepper';
import InputModalStepperProvider from '../InputModalStepperProvider';

const ModalStepper = ({ isOpen, onToggle, onInputMediaChange, multiple, selectedFiles }) => {
  return (
    <InputModalStepperProvider selectedFiles={selectedFiles} multiple={multiple} isOpen={isOpen}>
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
  selectedFiles: null,
};

ModalStepper.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  multiple: PropTypes.bool.isRequired,
  onInputMediaChange: PropTypes.func,
  onToggle: PropTypes.func,
  selectedFiles: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default ModalStepper;
