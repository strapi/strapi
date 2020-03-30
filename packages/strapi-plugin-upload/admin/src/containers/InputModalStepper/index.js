import React from 'react';
import PropTypes from 'prop-types';
import { DndProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import DragLayer from '../../components/DragLayer';
import InputModalStepper from './InputModalStepper';
import InputModalStepperProvider from '../InputModalStepperProvider';

const InputModal = ({
  fileToEdit,
  isOpen,
  onToggle,
  onInputMediaChange,
  multiple,
  selectedFiles,
  step,
}) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <DragLayer />
      <InputModalStepperProvider
        step={step}
        selectedFiles={selectedFiles}
        multiple={multiple}
        isOpen={isOpen}
        initialFileToEdit={fileToEdit}
      >
        <InputModalStepper
          isOpen={isOpen}
          onToggle={onToggle}
          onInputMediaChange={onInputMediaChange}
        />
      </InputModalStepperProvider>
    </DndProvider>
  );
};

InputModal.defaultProps = {
  fileToEdit: null,
  onInputMediaChange: () => {},
  onToggle: () => {},
  selectedFiles: null,
  step: 'list',
};

InputModal.propTypes = {
  fileToEdit: PropTypes.object,
  isOpen: PropTypes.bool.isRequired,
  multiple: PropTypes.bool.isRequired,
  onInputMediaChange: PropTypes.func,
  onToggle: PropTypes.func,
  selectedFiles: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  step: PropTypes.string,
};

export default InputModal;
