import React, { useEffect, useReducer, useRef } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Modal, ModalFooter, useGlobalContext, request } from 'strapi-helper-plugin';
import { Button } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import ModalHeader from '../../components/ModalHeader';
import stepper from './utils/stepper';
import init from './init';
import reducer, { initialState } from './reducer';
import { getTrad } from '../../utils';

const ModalStepper = ({ initialFileToEdit, initialStep, isOpen, onClosed, onToggle }) => {
  const { formatMessage } = useGlobalContext();
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const { currentStep, fileToEdit, filesToUpload } = reducerState.toJS();
  const { Component, headers, next, prev, withBackButton } = stepper[currentStep];
  const filesToUploadLength = filesToUpload.length;
  const toggleRef = useRef(onToggle);
  const editModalRef = useRef();

  console.log(fileToEdit);

  useEffect(() => {
    if (currentStep === 'upload' && filesToUploadLength === 0) {
      // Passing true to the onToggle prop will refetch the data when the modal closes
      toggleRef.current(true);
    }
  }, [filesToUploadLength, currentStep]);

  useEffect(() => {
    if (isOpen) {
      goTo(initialStep);

      if (initialFileToEdit) {
        dispatch({
          type: 'INIT_FILE_TO_EDIT',
          fileToEdit: initialFileToEdit,
        });
      }
    }
    // Disabling the rule because we just want to let the ability to open the modal
    // at a specific step then we will let the stepper handle the navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value,
    });
  };

  const handleClickDeleteFileToUpload = fileIndex => {
    dispatch({
      type: 'REMOVE_FILE_TO_UPLOAD',
      fileIndex,
    });

    if (currentStep === 'edit-new') {
      dispatch({
        type: 'RESET_FILE_TO_EDIT',
      });

      goNext();
    }
  };

  const handleClosed = () => {
    onClosed();

    dispatch({
      type: 'RESET_PROPS',
    });
  };

  const handleGoToEditNewFile = fileIndex => {
    dispatch({
      type: 'SET_FILE_TO_EDIT',
      fileIndex,
    });

    goTo('edit-new');
  };

  const handleGoToAddBrowseFiles = () => {
    dispatch({
      type: 'CLEAN_FILES_ERROR',
    });

    goBack();
  };

  const handleSetCropResult = blob => {
    dispatch({
      type: 'SET_CROP_RESULT',
      blob,
    });
  };

  const handleSubmitEditNewFile = e => {
    e.preventDefault();

    dispatch({
      type: 'ON_SUBMIT_EDIT_NEW_FILE',
    });

    goNext();
  };

  const handleSubmitEditExistingFile = async (e, shouldDuplicateMedia = false) => {
    e.preventDefault();

    dispatch({
      type: 'ON_SUBMIT_EDIT_EXISTING_FILE',
    });

    const headers = {};
    const formData = new FormData();

    // The endpoints are different when we want to just update the file infos
    const didCropFile = fileToEdit.file instanceof File;
    const { abortController, id, file, fileInfo } = fileToEdit;
    let requestURL = shouldDuplicateMedia ? `/${pluginId}` : `/${pluginId}?id=${id}`;

    if (didCropFile) {
      formData.append('files', file);
      formData.append('fileInfo', JSON.stringify(fileInfo));

      try {
        await request(
          requestURL,
          {
            method: 'POST',
            headers,
            body: formData,
            signal: abortController.signal,
          },
          false,
          false
        );

        // Close the modal and refetch data
        toggleRef.current(true);
      } catch (err) {
        console.log(err);
      }
    } else {
      requestURL = `/${pluginId}/files/${id}`;

      // The following will not work waiting for the back-end to be ready
      try {
        await request(requestURL, { method: 'PUT', body: fileInfo });
        // Do something
      } catch (err) {
        // Do something with error

        console.log('err');
      }
    }

    console.log('submit', shouldDuplicateMedia);
    console.log({ fileToEdit });
  };

  const handleReplaceMedia = () => {
    editModalRef.current.click();
  };

  const handleToggle = () => {
    if (filesToUploadLength > 0) {
      // eslint-disable-next-line no-alert
      const confirm = window.confirm(formatMessage({ id: getTrad('window.confirm.close-modal') }));

      if (!confirm) {
        return;
      }
    }

    onToggle();
  };

  console.log(fileToEdit);

  const handleUploadFiles = async () => {
    dispatch({
      type: 'SET_FILES_UPLOADING_STATE',
    });

    const requests = filesToUpload.map(
      async ({ file, fileInfo, originalIndex, abortController }) => {
        const formData = new FormData();
        const headers = {};
        formData.append('files', file);
        formData.append('fileInfo', JSON.stringify(fileInfo));

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
            ['response', 'payload', 'message', '0', 'messages', '0', 'message'],
            null
          );

          dispatch({
            type: 'SET_FILE_ERROR',
            fileIndex: originalIndex,
            errorMessage,
          });
        }
      }
    );

    await Promise.all(requests);
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
    <Modal isOpen={isOpen} onToggle={handleToggle} onClosed={handleClosed}>
      {/* header title */}
      <ModalHeader
        goBack={goBack}
        headers={headers.map(headerTrad => ({
          key: headerTrad,
          element: <FormattedMessage id={headerTrad} />,
        }))}
        withBackButton={withBackButton}
      />
      {/* body of the modal */}
      {Component && (
        <Component
          addFilesToUpload={addFilesToUpload}
          fileToEdit={fileToEdit}
          filesToUpload={filesToUpload}
          onChange={handleChange}
          onClickCancelUpload={handleCancelFileToUpload}
          onClickDeleteFileToUpload={handleClickDeleteFileToUpload}
          onClickEditNewFile={handleGoToEditNewFile}
          onGoToAddBrowseFiles={handleGoToAddBrowseFiles}
          onSubmitEdit={
            currentStep === 'edit-new' ? handleSubmitEditNewFile : handleSubmitEditExistingFile
          }
          onToggle={handleToggle}
          ref={currentStep === 'edit' ? editModalRef : null}
          setCropResult={handleSetCropResult}
          withBackButton={withBackButton}
        />
      )}

      <ModalFooter>
        <section>
          <Button type="button" color="cancel" onClick={handleToggle}>
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
          {currentStep === 'edit-new' && (
            <Button color="success" type="button" onClick={handleSubmitEditNewFile}>
              {formatMessage({ id: 'form.button.finish' })}
            </Button>
          )}
          {currentStep === 'edit' && (
            <div style={{ margin: 'auto 0' }}>
              <Button
                key="replace"
                color="primary"
                onClick={handleReplaceMedia}
                style={{ marginRight: 10 }}
              >
                Replace media
              </Button>

              <Button
                key="success"
                color="success"
                type="button"
                onClick={handleSubmitEditExistingFile}
              >
                {formatMessage({ id: 'form.button.finish' })}
              </Button>
            </div>
          )}
        </section>
      </ModalFooter>
    </Modal>
  );
};

ModalStepper.defaultProps = {
  initialFileToEdit: null,
  initialStep: 'browse',
  onClosed: () => {},
  onToggle: () => {},
};

ModalStepper.propTypes = {
  initialFileToEdit: PropTypes.object,
  initialStep: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  onClosed: PropTypes.func,
  onToggle: PropTypes.func,
};

export default ModalStepper;
