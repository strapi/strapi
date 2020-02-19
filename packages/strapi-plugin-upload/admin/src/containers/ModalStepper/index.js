import React, { useEffect, useReducer, useRef } from 'react';
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
import getTrad from '../../utils/getTrad';

const ModalStepper = ({ isOpen, onToggle }) => {
  const { formatMessage } = useGlobalContext();
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const { currentStep, filesToUpload } = reducerState.toJS();
  const { Component, headerTradId, next, prev } = stepper[currentStep];
  const filesToUploadLength = filesToUpload.length;
  const toggleRef = useRef();
  toggleRef.current = onToggle;

  useEffect(() => {
    if (currentStep === 'upload' && filesToUploadLength === 0) {
      // Close modal when file uploading is over
      toggleRef.current();
    }
  }, [filesToUploadLength, currentStep]);

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

  const handleGoToAddBrowseFiles = () => {
    dispatch({
      type: 'CLEAN_FILES_ERROR',
    });

    goBack();
  };

  const handleUploadFiles = async () => {
    dispatch({
      type: 'SET_FILES_UPLOADING_STATE',
    });

    try {
      const requests = filesToUpload.map(
        async ({ file, originalIndex, abortController }) => {
          const formData = new FormData();
          const headers = {};
          formData.append('files', file);

          try {
            await request(
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

            dispatch({
              type: 'REMOVE_FILE_TO_UPLOAD',
              fileIndex: originalIndex,
            });
          } catch (err) {
            const errorMessage = get(
              err,
              [
                'response',
                'payload',
                'message',
                '0',
                'messages',
                '0',
                'message',
              ],
              null
            );
            console.log({ err: errorMessage, p: err.response, originalIndex });

            dispatch({
              type: 'SET_FILE_ERROR',
              fileIndex: originalIndex,
              errorMessage,
            });
          }
        }
      );

      await Promise.all(requests);
    } catch (err) {
      // Silent
    }
  };

  const goBack = () => {
    goTo(prev);
  };

  // FIXME: when back button needed
  // eslint-disable-next-line no-unused-vars
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
          onGoToAddBrowseFiles={handleGoToAddBrowseFiles}
        />
      )}

      <ModalFooter>
        <section>
          <Button type="button" color="cancel" onClick={onToggle}>
            {formatMessage({ id: 'app.components.Button.cancel' })}
          </Button>
          {currentStep === 'upload' && (
            <Button type="button" color="success" onClick={handleUploadFiles}>
              {formatMessage(
                {
                  id: getTrad(
                    `modal.upload-list.footer.button.${
                      filesToUploadLength > 1 ? 'plural' : 'singular'
                    }`
                  ),
                },
                { number: filesToUploadLength }
              )}
            </Button>
          )}
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
