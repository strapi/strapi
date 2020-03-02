/**
 *
 * SizeInput
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { InputNumber, Select } from '@buffetjs/core';

import Wrapper from './Wrapper';

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
    <Wrapper>
      <div className="row">
        <div className="col-6">
          <InputNumber
            {...rest}
            name="size_value"
            onChange={handleChangeValue}
            value={size}
          />
        </div>
        <div className="col-6">
          <Select
            name="format_value"
            onChange={handleChangeFormat}
            options={options}
            value={format}
          />
        </div>
      </div>
    </Wrapper>
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
