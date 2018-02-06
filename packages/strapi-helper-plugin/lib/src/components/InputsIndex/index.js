/**
 *
 * InputsIndex references all the input with errors available
 */

import React from 'react';
import PropTypes from 'prop-types';

// Design
import InputCheckboxWithErrors from 'components/InputCheckboxWithErrors';
import InputDateWithErrors from 'components/InputDateWithErrors';
import InputEmailWithErrors from 'components/InputEmailWithErrors';
import InputNumberWithErrors from 'components/InputNumberWithErrors';
import InputSearchWithErrors from 'components/InputSearchWithErrors';
import InputSelectWithErrors from 'components/InputSelectWithErrors';
import InputPasswordWithErrors from 'components/InputPasswordWithErrors';
import InputTextAreaWithErrors from 'components/InputTextAreaWithErrors';
import InputTextWithErrors from 'components/InputTextWithErrors';
import InputToggleWithErrors from 'components/InputToggleWithErrors';

const DefaultInputError = ({ type }) => <div>Your input type: <b>{type}</b> does not exist</div>

const inputs = {
  checkbox: InputCheckboxWithErrors,
  date: InputDateWithErrors,
  email: InputEmailWithErrors,
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
  const Input = inputs[props.type] ? inputs[props.type] : DefaultInputError;

  return <Input {...props} />;
}

InputsIndex.propTypes = {
  type: PropTypes.string.isRequired,
};

export default InputsIndex;
export {
  InputCheckboxWithErrors,
  InputDateWithErrors,
  InputEmailWithErrors,
  InputNumberWithErrors,
  InputPasswordWithErrors,
  InputSearchWithErrors,
  InputSelectWithErrors,
  InputTextWithErrors,
  InputTextAreaWithErrors,
  InputToggleWithErrors,
};
