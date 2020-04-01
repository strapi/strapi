import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { get } from 'lodash';
import { prefixFileUrlWithBackendUrl } from 'strapi-helper-plugin';

import { getTrad, formatFileForEditing } from '../../utils';
import CardControl from '../CardControl';
import CardControlWrapper from './CardControlWrapper';
import CardPreviewWrapper from './CardPreviewWrapper';
import EmptyInputMedia from './EmptyInputMedia';
import EmptyText from './EmptyText';
import IconUpload from './IconUpload';
import InputFilePreview from './InputFilePreview';
import InputModalStepper from '../../containers/InputModalStepper';
import Name from './Name';
import Wrapper from './Wrapper';
import Input from '../Input';

const InputMedia = ({ label, onChange, name, attribute, value, type }) => {
  const [modal, setModal] = useState({
    isOpen: false,
    step: null,
    fileToEdit: null,
  });
  const [fileToDisplay, setFileToDisplay] = useState(0);
  const hasNoValue = !!value && Array.isArray(value) && value.length === 0;
  const currentFile = attribute.multiple ? value[fileToDisplay] : value;
  const fileURL = get(currentFile, ['url'], null);
  const prefixedFileURL = fileURL ? prefixFileUrlWithBackendUrl(fileURL) : null;
  const displaySlidePagination =
    attribute.multiple && value.length > 1 ? ` (${fileToDisplay + 1}/${value.length})` : '';

  const handleClickToggleModal = () => {
    setModal(prev => ({ step: 'list', isOpen: !prev.isOpen, fileToEdit: null }));
  };

  const handleChange = v => {
    onChange({ target: { name, type, value: v } });
  };

  const handleFilesNavigation = displayNext => {
    if (attribute.multiple) {
      if (displayNext && fileToDisplay === value.length - 1) {
        setFileToDisplay(0);

        return;
      }

      if (!displayNext && fileToDisplay === 0) {
        setFileToDisplay(value.length - 1);
      } else {
        setFileToDisplay(prev => (displayNext ? prev + 1 : prev - 1));
      }
    }
  };

  const handleRemoveFile = () => {
    const newValue = attribute.multiple
      ? value.filter((file, index) => index !== fileToDisplay)
      : null;

    if (Array.isArray(newValue) && fileToDisplay === newValue.length) {
      setFileToDisplay(fileToDisplay > 0 ? fileToDisplay - 1 : fileToDisplay);
    }

    handleChange(newValue);
  };

  const handleEditFile = () => {
    setModal(() => ({ isOpen: true, step: 'edit', fileToEdit: formatFileForEditing(currentFile) }));
  };

  const handleCopy = () => {
    strapi.notification.info(getTrad('notification.link-copied'));
  };

  const handleAllowDrop = e => e.preventDefault();

  const handleDrop = e => {
    e.preventDefault();
    e.persist();

    if (e.dataTransfer) {
      setModal(() => ({ isOpen: true, step: 'upload', filesToUpload: e.dataTransfer.files }));
    }
  };

  return (
    <Wrapper>
      <Name htmlFor={name}>{`${label}${displaySlidePagination}`}</Name>

      <CardPreviewWrapper onDragOver={handleAllowDrop} onDrop={handleDrop}>
        <CardControlWrapper>
          <CardControl title="add" color="#9EA7B8" type="plus" onClick={handleClickToggleModal} />
          {!hasNoValue && (
            <>
              <CardControl title="edit" color="#9EA7B8" type="pencil" onClick={handleEditFile} />
              <CopyToClipboard onCopy={handleCopy} text={prefixedFileURL}>
                <CardControl title="copy-link" color="#9EA7B8" type="link" />
              </CopyToClipboard>
              <CardControl
                title="delete"
                color="#9EA7B8"
                type="trash-alt"
                onClick={handleRemoveFile}
              />
            </>
          )}
        </CardControlWrapper>
        {hasNoValue ? (
          <EmptyInputMedia onClick={handleClickToggleModal}>
            <IconUpload />
            <EmptyText id={getTrad('input.placeholder')} />
          </EmptyInputMedia>
        ) : (
          <InputFilePreview
            isSlider={attribute.multiple && value.length > 1}
            file={currentFile}
            onClick={handleFilesNavigation}
          />
        )}
        <Input type="file" name={name} />
      </CardPreviewWrapper>

      {modal.isOpen && (
        <InputModalStepper
          isOpen={modal.isOpen}
          step={modal.step}
          fileToEdit={modal.fileToEdit}
          filesToUpload={modal.filesToUpload}
          multiple={attribute.multiple}
          onInputMediaChange={handleChange}
          selectedFiles={value}
          onToggle={handleClickToggleModal}
          allowedTypes={attribute.allowedTypes}
        />
      )}
    </Wrapper>
  );
};

InputMedia.propTypes = {
  attribute: PropTypes.shape({
    allowedTypes: PropTypes.arrayOf(PropTypes.string),
    multiple: PropTypes.bool,
    required: PropTypes.bool,
    type: PropTypes.string,
  }).isRequired,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};
InputMedia.defaultProps = {
  label: '',
  value: null,
};

export default InputMedia;
