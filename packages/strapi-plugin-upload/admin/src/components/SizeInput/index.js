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

    handleChange();
  };

  const handleChangeFormat = ({ target: { value } }) => {
    setFormat(value);

    handleChange();
  };

  const handleChange = () => {
    onChange({
      target: {
        name: 'value',
        value: {
          size,
          format,
        },
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
            value={value.size}
          />
        </div>
        <div className="col-6">
          <Select
            name="format_value"
            onChange={handleChangeFormat}
            options={options}
            value={value.format}
          />
        </div>
      </div>
    </Wrapper>
  );
}

SizeInput.defaultProps = {
  onChange: () => {},
  value: {},
};

SizeInput.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.shape({
    size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    format: PropTypes.string,
  }),
};

export default SizeInput;
