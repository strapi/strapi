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
  const { currentStep, filesToUpload } = reducerState.toJS();
  const { Component, headerTradId, next, prev } = stepper[currentStep];

  const addFilesToUpload = ({ target: { value } }) => {
    dispatch({
      type: 'ADD_FILES_TO_UPLOAD',
      filesToUpload: value,
    });

    goTo(next);
  };

  const handleClosed = () => {
    dispatch({
      type: 'RESET_PROPS',
    });
  };

  // FIXME: when back button needed
  // eslint-disable-next-line no-unused-vars
  const goBack = () => {
    goTo(prev);
  };

  const goTo = to => {
    dispatch({
      type: 'GO_TO',
      to,
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
            <FormattedMessage id={headerTradId} />
          </HeaderModalTitle>
        </section>
      </HeaderModal>
      {/* body of the modal */}
      {Component && (
        <Component
          addFilesToUpload={addFilesToUpload}
          filesToUpload={filesToUpload}
          onGoToAddBrowseFiles={goBack}
        />
      )}

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
