/**
 *
 * InputsIndex references all the input with errors available
 */

/* eslint-disable react/require-default-props */
import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty, isObject, merge } from 'lodash';

// Design
import InputAddonWithErrors from '../InputAddonWithErrors';
import InputCheckboxWithErrors from '../InputCheckboxWithErrors';
import InputDateWithErrors from '../InputDateWithErrors';
import InputEmailWithErrors from '../InputEmailWithErrors';
import InputFileWithErrors from '../InputFileWithErrors';
import InputNumberWithErrors from '../InputNumberWithErrors';
import InputSearchWithErrors from '../InputSearchWithErrors';
import InputSelectWithErrors from '../InputSelectWithErrors';
import InputPasswordWithErrors from '../InputPasswordWithErrors';
import InputTextAreaWithErrors from '../InputTextAreaWithErrors';
import InputTextWithErrors from '../InputTextWithErrors';
import InputToggleWithErrors from '../InputToggleWithErrors';

const DefaultInputError = ({ type }) => <div>Your input type: <b>{type}</b> does not exist</div>;

const inputs = {
  addon: InputAddonWithErrors,
  checkbox: InputCheckboxWithErrors,
  date: InputDateWithErrors,
  email: InputEmailWithErrors,
  file: InputFileWithErrors,
  number: InputNumberWithErrors,
  password: InputPasswordWithErrors,
  search: InputSearchWithErrors,
  select: InputSelectWithErrors,
  string: InputTextWithErrors,
  text: InputTextWithErrors,
  textarea: InputTextAreaWithErrors,
  toggle: InputToggleWithErrors,
};

function InputsIndex(props) {
  const type = props.type && !isEmpty(props.addon) ? 'addon' : props.type;
  let inputValue;
  switch (props.type) {
    case 'checkbox':
    case 'toggle':
      inputValue = props.value || false;
      break;
    case 'number':
      inputValue = props.value === 0 ? props.value : props.value || '';
      break;
    case 'file':
      inputValue = props.value || [];
      break;
    case 'json':
      inputValue = isObject(props.value) ? props.value : null;
      break;
    default:
      inputValue = props.value || '';
  }

  merge(inputs, props.customInputs);
  
  const Input = inputs[type] ? inputs[type] : DefaultInputError;

  return <Input {...props} value={inputValue} />;
}

DefaultInputError.propTypes = {
  type: PropTypes.string.isRequired,
};

InputsIndex.defaultProps = {
  addon: false,
  customInputs: {},
};

InputsIndex.propTypes = {
  addon: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.string,
  ]),
  customInputs: PropTypes.object,
  type: PropTypes.string.isRequired,
  value: PropTypes.any,
};

export default InputsIndex;
