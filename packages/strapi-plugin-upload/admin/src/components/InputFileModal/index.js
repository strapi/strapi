import React, { createRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@buffetjs/core';
import { useGlobalContext } from 'strapi-helper-plugin';
import { getTrad } from '../../utils';
import Cloud from '../../icons/Cloud';
import Label from './Label';
import Input from '../Input';
import P from './P';

const InputFileModal = ({ name, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { formatMessage } = useGlobalContext();
  const ref = createRef();

  const handleAllowDrop = e => e.preventDefault();

  const handleChange = ({ target: { files } }) => {
    onChange({ target: { name, value: files } });
  };

  const handleClick = () => {
    ref.current.click();
  };

  const handleDragEnter = () => {
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = e => {
    e.preventDefault();

    setIsDragging(false);
    onChange({ target: { name, value: e.dataTransfer.files } });
  };

  return (
    <Label
      htmlFor={name}
      isDragging={isDragging}
      onDragOver={handleAllowDrop}
      onDragEnter={handleDragEnter}
      onDrop={handleDrop}
    >
      <Cloud />
      <P>
        <span className="bold">{formatMessage({ id: getTrad('input.label-bold') })}&nbsp;</span>
        <span>{formatMessage({ id: getTrad('input.label-normal') })}</span>
      </P>
      <Button type="button" id="button" name="button" color="primary" onClick={handleClick}>
        {formatMessage({ id: getTrad('input.button.label') })}
      </Button>
      <Input ref={ref} type="file" multiple name={name} onChange={handleChange} />
      {isDragging && <div className="dragzone" onDragLeave={handleDragLeave} />}
    </Label>
  );
};

InputFileModal.defaultProps = {
  name: 'files',
  onChange: () => {},
};

InputFileModal.propTypes = {
  name: PropTypes.string,
  onChange: PropTypes.func,
};

export default InputFileModal;
