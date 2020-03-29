import React from 'react';
import PropTypes from 'prop-types';
import { DndProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import DragLayer from '../../components/DragLayer';
import InputModalStepper from './InputModalStepper';
import InputModalStepperProvider from '../InputModalStepperProvider';

const InputModal = ({
  allowedTypes,
  fileToEdit,
  isOpen,
  multiple,
  onInputMediaChange,
  onToggle,
  selectedFiles,
  step,
}) => {
  const singularTypes = allowedTypes.map(type => type.substring(0, type.length - 1));
  const typeToDisable = ['video', 'image', 'file'].filter(f => !singularTypes.includes(f));
  const nContainsFilters = typeToDisable.map(type => ({
    name: 'mime',
    filter: '_ncontains',
    value: type,
    isDisabled: true,
  }));

  return (
    <DndProvider backend={HTML5Backend}>
      <DragLayer />
      <InputModalStepperProvider
        initialFileToEdit={fileToEdit}
        initialFilters={nContainsFilters}
        isOpen={isOpen}
        multiple={multiple}
        selectedFiles={selectedFiles}
        step={step}
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
  allowedTypes: [],
  fileToEdit: null,
  onInputMediaChange: () => {},
  onToggle: () => {},
  selectedFiles: null,
  step: 'list',
};

InputModal.propTypes = {
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
  fileToEdit: PropTypes.object,
  isOpen: PropTypes.bool.isRequired,
  multiple: PropTypes.bool.isRequired,
  onInputMediaChange: PropTypes.func,
  onToggle: PropTypes.func,
  selectedFiles: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  step: PropTypes.string,
};

export default InputModal;
