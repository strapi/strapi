/**
 *
 * SizeInput
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { InputNumber, Select } from '@buffetjs/core';

import Wrapper from './Wrapper';

function SizeInput({ onChange, ...rest }) {
  const options = ['KB', 'MB', 'GB'];
  const [value, setValue] = useState(0);
  const [format, setFormat] = useState('KB');

  const handleChangeValue = ({ target: { value } }) => {
    setValue(value);

    handleChange();
  };

  const handleChangeFormat = ({ target: { value } }) => {
    setFormat(value);

    handleChange();
  };

  const handleChange = () => {
    onChange({
      target: { name: 'value', value: `${value}${format}` },
    });
  };

  return (
    <Wrapper>
      <InputNumber
        {...rest}
        name="size_value"
        onChange={handleChangeValue}
        value={value}
      />
      <Select
        name="size_type"
        onChange={handleChangeFormat}
        options={options}
        value={format}
      />
    </Wrapper>
  );
}

SizeInput.defaultProps = {
  onChange: () => {},
};

SizeInput.propTypes = {
  onChange: PropTypes.func,
};

export default SizeInput;
