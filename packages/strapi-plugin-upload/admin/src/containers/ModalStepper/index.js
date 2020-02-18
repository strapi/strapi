import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import {
  HeaderModal,
  HeaderModalTitle,
  Modal,
  ModalFooter,
  useGlobalContext,
} from 'strapi-helper-plugin';
import { Button } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';
import stepper from './utils/stepper';
import init from './init';
import reducer, { initialState } from './reducer';

const ModalStepper = ({ isOpen, onToggle }) => {
  const { formatMessage } = useGlobalContext();
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const { currentStep } = reducerState.toJS();
  const currentStepObject = stepper[currentStep];
  const { Component } = currentStepObject;

  const handleClosed = () => {
    dispatch({
      type: 'RESET_PROPS',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onToggle={onToggle}
      // TODO: reset to initialState
      onClosed={handleClosed}
    >
      {/* header title */}
      <HeaderModal>
        <section>
          <HeaderModalTitle>
            <FormattedMessage id={currentStepObject.headerTradId} />
          </HeaderModalTitle>
        </section>
      </HeaderModal>
      {/* body */}
      {Component && <Component />}

      <ModalFooter>
        <section>
          <Button type="button" color="cancel" onClick={onToggle}>
            {formatMessage({ id: 'app.components.Button.cancel' })}
          </Button>
        </section>
      </ModalFooter>
    </Modal>
  );
};

ModalStepper.defaultProps = {
  onToggle: () => {},
};

ModalStepper.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func,
};

export default ModalStepper;
