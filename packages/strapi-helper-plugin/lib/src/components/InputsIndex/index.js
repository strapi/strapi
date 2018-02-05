/**
 *
 * InputsIndex references all the input with errors available
 */

import React from 'react';
import PropTypes from 'prop-types';

// Design
import InputNumberWithErrors from 'components/InputNumberWithErrors';
import InputSelectWithErrors from 'components/InputSelectWithErrors';
import InputTextAreaWithErrors from 'components/InputTextAreaWithErrors';
import InputTextWithErrors from 'components/InputTextWithErrors';
import InputToggleWithErrors from 'components/InputToggleWithErrors';

const DefaultInputError = ({ type }) => <div>Your input type: <b>{type}</b> does not exist</div>

const inputs = {
  number: InputNumberWithErrors,
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
  InputNumberWithErrors,
  InputSelectWithErrors,
  InputTextWithErrors,
  InputTextAreaWithErrors,
  InputToggleWithErrors,
};
