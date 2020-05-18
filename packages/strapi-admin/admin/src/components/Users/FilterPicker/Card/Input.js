import React from 'react';
import PropTypes from 'prop-types';
import { InputText, Select, Toggle } from '@buffetjs/core';
import { formatInputValue } from './utils';

const getInputType = type => {
  switch (type) {
    case 'toggle':
      return Toggle;
    case 'booleanSelect':
      return Select;
    default:
      return InputText;
  }
};

function Input({ onChange, type, ...rest }) {
  const Component = getInputType(type);
  const handleChange = ({ target: { name, value } }) => {
    onChange({ target: { name, value: formatInputValue(type, value) } });
  };

  return <Component onChange={handleChange} {...rest} autoComplete="off" />;
}

Input.defaultProps = {
  onChange: () => {},
};

Input.propTypes = {
  onChange: PropTypes.func,
  type: PropTypes.string.isRequired,
};

export default Input;
