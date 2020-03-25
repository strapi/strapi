import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { getTrad } from '../../utils';
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

const InputMedia = ({ label, onChange, name, attribute, value, type }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileToDisplay, setFileToDisplay] = useState(0);
  const handleClickToggleModal = () => {
    setIsModalOpen(prev => !prev);
  };
  const hasNoValue = Array.isArray(value) && value.length === 0;

  const handleChange = v => {
    onChange({ target: { name, type, value: v } });
  };

  const handleFilesNavigation = displayNext => {
    if (displayNext && fileToDisplay === value.length - 1) {
      setFileToDisplay(0);

      return;
    }

    if (!displayNext && fileToDisplay === 0) {
      setFileToDisplay(value.length - 1);
    } else {
      setFileToDisplay(prev => (displayNext ? prev + 1 : prev - 1));
    }
  };

  const displaySlidePagination =
    attribute.multiple && value.length > 1 ? ` (${fileToDisplay + 1}/${value.length})` : '';

  return (
    <Wrapper>
      <Name htmlFor={name}>{`${label}${displaySlidePagination}`}</Name>

      <CardPreviewWrapper>
        <CardControlWrapper>
          <CardControl color="#9EA7B8" type="plus" onClick={() => handleClickToggleModal(value)} />
        </CardControlWrapper>
        {hasNoValue ? (
          <EmptyInputMedia>
            <IconUpload />
            <EmptyText id={getTrad('input.placeholder')} />
          </EmptyInputMedia>
        ) : (
          <InputFilePreview
            file={value[fileToDisplay]}
            multiple={attribute.multiple}
            onClick={handleFilesNavigation}
          />
        )}
      </CardPreviewWrapper>

      {isModalOpen && (
        <InputModalStepper
          isOpen={isModalOpen}
          multiple={attribute.multiple}
          onInputMediaChange={handleChange}
          onToggle={handleClickToggleModal}
        />
      )}
    </Wrapper>
  );
};

InputMedia.propTypes = {
  attribute: PropTypes.shape({
    multiple: PropTypes.bool,
    required: PropTypes.bool,
    type: PropTypes.string,
  }).isRequired,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
  value: PropTypes.array,
};
InputMedia.defaultProps = {
  label: '',
  value: null,
};

export default InputMedia;
