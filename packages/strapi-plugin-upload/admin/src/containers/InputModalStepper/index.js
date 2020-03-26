import React from 'react';
import PropTypes from 'prop-types';
import { DndProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import DragLayer from '../../components/DragLayer';
import InputModalStepper from './InputModalStepper';
import InputModalStepperProvider from '../InputModalStepperProvider';

const ModalStepper = ({ isOpen, onToggle, onInputMediaChange, multiple, selectedFiles }) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <DragLayer />
      <InputModalStepperProvider selectedFiles={selectedFiles} multiple={multiple} isOpen={isOpen}>
        <InputModalStepper
          isOpen={isOpen}
          onToggle={onToggle}
          onInputMediaChange={onInputMediaChange}
        />
      </InputModalStepperProvider>
    </DndProvider>
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
