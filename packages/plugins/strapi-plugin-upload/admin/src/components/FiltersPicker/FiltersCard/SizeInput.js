/**
 *
 * SizeInput
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { InputNumber, Select } from '@buffetjs/core';

import Flex from '../../Flex';
import Padded from '../../Padded';

function SizeInput({ onChange, value, ...rest }) {
  const options = ['KB', 'MB', 'GB'];
  const [size, setSize] = useState(0);
  const [format, setFormat] = useState('KB');

  const handleChangeValue = ({ target: { value } }) => {
    setSize(value);

    onChange({
      target: {
        name: 'value',
        value: `${value}${format}`,
      },
    });
  };

  const handleChangeFormat = ({ target: { value } }) => {
    setFormat(value);

    onChange({
      target: {
        name: 'value',
        value: `${size}${value}`,
      },
    });
  };

  return (
    <Flex justifyContent="space-between">
      <InputNumber {...rest} name="size_value" onChange={handleChangeValue} value={size} />
      <Padded left />
      <Select name="format_value" onChange={handleChangeFormat} options={options} value={format} />
    </Flex>
  );
}

SizeInput.defaultProps = {
  onChange: () => {},
  value: null,
};

SizeInput.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
};

export default SizeInput;
