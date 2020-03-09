import React from 'react';
import PropTypes from 'prop-types';

import InputModalStepperProvider from '../../containers/InputModalStepperProvider';
import InputModalStepper from './InputModalStepper';

const ModalStepper = ({ isOpen, onToggle, onChange, multiple }) => {
  return (
    <InputModalStepperProvider multiple={multiple} isOpen={isOpen}>
      <InputModalStepper isOpen={isOpen} onToggle={onToggle} onChange={onChange} />
    </InputModalStepperProvider>
  );
};

ModalStepper.defaultProps = {
  onToggle: () => {},
  onChange: () => {},
};

ModalStepper.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func,
  onChange: PropTypes.func,
  multiple: PropTypes.bool.isRequired,
};

export default ModalStepper;
