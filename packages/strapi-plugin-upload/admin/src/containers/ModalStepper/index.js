import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import {
  HeaderModal,
  HeaderModalTitle,
  Modal,
  ModalFooter,
  useGlobalContext,
  request,
} from 'strapi-helper-plugin';
import { Button } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
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

  const handleCancelFileToUpload = fileIndex => {
    const fileToCancel = get(filesToUpload, fileIndex, {});

    // Cancel upload
    fileToCancel.abortController.abort();

    dispatch({
      type: 'REMOVE_FILE_TO_UPLOAD',
      fileIndex,
    });
  };

  const handleClosed = () => {
    dispatch({
      type: 'RESET_PROPS',
    });
  };

  const handleUploadFiles = async () => {
    dispatch({
      type: 'SET_FILES_UPLOADING_STATE',
    });

    try {
      const requests = filesToUpload.map(({ file, abortController }) => {
        const formData = new FormData();
        const headers = {};
        formData.append('files', file);

        return request(
          `/${pluginId}`,
          {
            method: 'POST',
            headers,
            body: formData,
            signal: abortController.signal,
          },
          false,
          false
        );
      });

      await Promise.all(requests);

      goNext();
    } catch (err) {
      console.log(err);
    }
  };

  // FIXME: when back button needed
  // eslint-disable-next-line no-unused-vars
  const goBack = () => {
    goTo(prev);
  };

  const goNext = () => {
    if (next === null) {
      onToggle();

      return;
    }

    goTo(next);
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
          onClickCancelUpload={handleCancelFileToUpload}
          onGoToAddBrowseFiles={goBack}
        />
      )}

      <ModalFooter>
        <section>
          <Button type="button" color="cancel" onClick={onToggle}>
            {formatMessage({ id: 'app.components.Button.cancel' })}
          </Button>
          <Button type="button" color="success" onClick={handleUploadFiles}>
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
