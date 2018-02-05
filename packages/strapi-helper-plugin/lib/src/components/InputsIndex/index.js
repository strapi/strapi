/**
 *
 * InputsIndex references all the input with errors available
 */

import React from 'react';
import PropTypes from 'prop-types';

// Design
import InputNumberWithErrors from 'components/InputNumberWithErrors';
import InputPasswordWithErrors from 'components/InputPasswordWithErrors';
import InputTextWithErrors from 'components/InputTextWithErrors';
import InputToggleWithErrors from 'components/InputToggleWithErrors';

const inputs = {
  number: InputNumberWithErrors,
  password: InputPasswordWithErrors,
  string: InputTextWithErrors,
  text: InputTextWithErrors,
  toggle: InputToggleWithErrors,
};

function InputsIndex(props) {
  const Input = inputs[props.type] || <div />;

  return <Input {...props} />;
}

InputsIndex.propTypes = {
  type: PropTypes.string.isRequired,
};

export default InputsIndex;
export {
  InputNumberWithErrors,
  InputPasswordWithErrors,
  InputTextWithErrors,
  InputToggleWithErrors,
};
