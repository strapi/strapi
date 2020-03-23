import React, { useState } from 'react';
import PropTypes from 'prop-types';

import CardPreview from '../CardPreview';
import ModalStepper from '../../containers/InputModalStepper';
import Name from './Name';
import Wrapper from './Wrapper';

const InputMedia = ({ label, onChange, name, attribute }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleClickToggleModal = () => {
    setIsModalOpen(prev => !prev);
  };

  return (
    <>
      <Name htmlFor={name}>{label}</Name>
      <Wrapper onClick={handleClickToggleModal}>
        <CardPreview url="https://images.pexels.com/photos/20787/pexels-photo.jpg?auto=compress&cs=tinysrgb&h=350" />
      </Wrapper>

      {isModalOpen && (
        <ModalStepper
          isOpen={isModalOpen}
          multiple={attribute.multiple}
          onChange={onChange}
          onToggle={handleClickToggleModal}
        />
      )}
    </>
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
};
InputMedia.defaultProps = {
  label: '',
};

export default InputMedia;
