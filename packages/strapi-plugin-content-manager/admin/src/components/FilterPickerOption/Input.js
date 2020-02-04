/**
 *
 * InputWithAutoFocus that programatically manage the autofocus of another one
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';

import { DateTime } from '@buffetjs/custom';
import {
  DatePicker,
  InputText,
  InputNumber,
  Select,
  TimePicker,
} from '@buffetjs/core';
import { InputWrapperDate } from './components';

const getInputType = attrType => {
  switch (attrType) {
    case 'boolean':
      return Select;
    case 'date':
    case 'timestamp':
    case 'timestampUpdate':
      return DatePicker;
    case 'datetime':
      return DateTime;
    case 'integer':
    case 'biginteger':
    case 'decimal':
    case 'float':
      return InputNumber;
    case 'time':
      return TimePicker;
    default:
      return InputText;
  }
};

function Input({ type, ...rest }) {
  const Component = getInputType(type);
  let style = type !== 'time' ? { width: '210px', paddingTop: '4px' } : {};

  if (['integer', 'biginteger', 'float', 'decimal'].includes(type)) {
    style = { marginRight: '20px' };
  }
  const styles =
    type === 'boolean' ? { minWidth: '100px', maxWidth: '200px' } : style;
  const wrapperStyle =
    type === 'boolean' ||
    ['date', 'timestamp', 'time', 'datetime'].includes(type)
      ? { marginRight: '20px' }
      : { marginRight: '10px' };

  return (
    <InputWrapperDate type={type || 'text'} style={wrapperStyle}>
      <Component {...rest} style={styles} autoComplete="off" />
    </InputWrapperDate>
  );
}

Input.propTypes = {
  type: PropTypes.string.isRequired,
};

export default memo(Input);
