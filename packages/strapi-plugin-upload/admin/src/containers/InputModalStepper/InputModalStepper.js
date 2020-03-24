import React, { useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalFooter, useGlobalContext } from 'strapi-helper-plugin';
import { Button } from '@buffetjs/core';
import ModalHeader from '../../components/ModalHeader';
import stepper from './stepper';
import getTrad from '../../utils/getTrad';
import useModalContext from '../../hooks/useModalContext';

const InputModalStepper = ({ isOpen, onToggle }) => {
  const { formatMessage } = useGlobalContext();
  const {
    addFilesToUpload,
    currentStep,
    fetchMediaLib,
    filesToUpload,
    fileToEdit,
    goTo,
    handleCancelFileToUpload,
    handleCleanFilesError,
    handleClose,
    handleFileToEditChange,
    handleGoToEditNewFile,
    handleRemoveFileToUpload,
    handleResetFileToEdit,
    handleSetCropResult,
    handleUploadFiles,
    onInputMediaChange,
    selectedFiles,
  } = useModalContext();
  const { Component, headerBreadcrumbs, next, prev, withBackButton, HeaderComponent } = stepper[
    currentStep
  ];
  const filesToUploadLength = filesToUpload.length;

  useEffect(() => {
    if (currentStep === 'upload' && filesToUploadLength === 0) {
      // Go to the modal list view when file uploading is over
      fetchMediaLib();
      goTo('list');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesToUploadLength, currentStep]);

  const addFilesToUploadList = ({ target: { value } }) => {
    addFilesToUpload({ target: { value } });

    goNext();
  };

  const handleClickDeleteFileToUpload = fileIndex => {
    handleRemoveFileToUpload(fileIndex);

    if (currentStep === 'edit-new') {
      handleResetFileToEdit();

      goNext();
    }
  };

  const handleGoToAddBrowseFiles = () => {
    handleCleanFilesError();

    goBack();
  };

  const handleSubmitEditNewFile = e => {
    e.preventDefault();

    onInputMediaChange({ target: { value: selectedFiles } });

    goNext();
  };

  const handleToggle = () => {
    if (filesToUploadLength > 0 || selectedFiles.length > 0) {
      // eslint-disable-next-line no-alert
      const confirm = window.confirm(formatMessage({ id: getTrad('window.confirm.close-modal') }));

      if (!confirm) {
        return;
      }
    }

    onToggle();
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

  return (
    <Modal isOpen={isOpen} onToggle={handleToggle} onClosed={handleClose}>
      {/* header title */}
      <ModalHeader
        goBack={goBack}
        HeaderComponent={HeaderComponent}
        headerBreadcrumbs={headerBreadcrumbs}
        withBackButton={withBackButton}
      />
      {/* body of the modal */}
      {Component && (
        <Component
          addFilesToUpload={addFilesToUploadList}
          fileToEdit={fileToEdit}
          filesToUpload={filesToUpload}
          onChange={handleFileToEditChange}
          onClickCancelUpload={handleCancelFileToUpload}
          onClickDeleteFileToUpload={handleClickDeleteFileToUpload}
          onClickEditNewFile={handleGoToEditNewFile}
          onGoToAddBrowseFiles={handleGoToAddBrowseFiles}
          onSubmitEditNewFile={handleSubmitEditNewFile}
          onToggle={handleToggle}
          setCropResult={handleSetCropResult}
          withBackButton={withBackButton}
        />
      )}

      <ModalFooter>
        <section>
          <Button type="button" color="cancel" onClick={handleToggle}>
            {formatMessage({ id: 'app.components.Button.cancel' })}
          </Button>
          {currentStep === 'upload' ? (
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
          ) : (
            <Button color="success" type="button" onClick={handleSubmitEditNewFile}>
              {formatMessage({ id: 'form.button.finish' })}
            </Button>
          )}
        </section>
      </ModalFooter>
    </Modal>
  );
};

InputModalStepper.defaultProps = {
  onToggle: () => {},
};

InputModalStepper.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func,
};

export default memo(InputModalStepper);
