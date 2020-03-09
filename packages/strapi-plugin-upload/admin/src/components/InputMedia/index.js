import React, { useState } from 'react';
import PropTypes from 'prop-types';

import ModalStepper from '../InputModalStepper';
import CardPreview from '../CardPreview';
import Wrapper from './Wrapper';
import Name from './Name';

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
          multiple={attribute.multiple}
          isOpen={isModalOpen}
          onChange={onChange}
          onToggle={handleClickToggleModal}
        />
      )}
    </>
  );
};

InputMedia.propTypes = {
  label: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  attribute: PropTypes.shape({
    type: PropTypes.string,
    multiple: PropTypes.bool,
    required: PropTypes.bool,
  }).isRequired,
};
InputMedia.defaultProps = {
  label: '',
};

export default InputMedia;
