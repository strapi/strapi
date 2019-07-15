/**
 *
 * InputWithAutoFocus that programatically manage the autofocus of another one
 */

import React from 'react';
import PropTypes from 'prop-types';

import { InputWrapperDate } from './components';

import {
  InputDate,
  InputNumber,
  InputSelect,
  InputText,
} from 'strapi-helper-plugin';

const getInputType = attrType => {
  switch (attrType) {
    case 'boolean':
      return InputSelect;
    case 'date':
    case 'datetime':
      return InputDate;
    case 'integer':
    case 'biginteger':
    case 'decimal':
    case 'float':
      return InputNumber;
    default:
      return InputText;
  }
};

function Input({ type, ...rest }) {
  const Component = getInputType(type);
  const style = { width: '210px', paddingTop: '4px' };
  const styles =
    type === 'boolean' ? { minWidth: '100px', maxWidth: '200px' } : style;

  const wrapperStyle = type == 'boolean' ? { marginRight: '20px' } : {};

  return (
    <InputWrapperDate type={type || 'text'} style={wrapperStyle}>
      <Component {...rest} style={styles} />
    </InputWrapperDate>
  );
}

Input.propTypes = {
  type: PropTypes.string.isRequired,
};

export default Input;
