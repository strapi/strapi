/**
 *
 * InputsIndex references all the input with errors available
 */

import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';

// Design
import InputAddonWithErrors from 'components/InputAddonWithErrors';
import InputCheckboxWithErrors from 'components/InputCheckboxWithErrors';
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
  addon: InputAddonWithErrors,
  checkbox: InputCheckboxWithErrors,
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
  const type = props.type && !isEmpty(props.addon) ? 'addon' : props.type;

  const Input = inputs[type] ? inputs[type] : DefaultInputError;

  return <Input {...props} />;
}

InputsIndex.defaultProps = {
  addon: false,
}

InputsIndex.propTypes = {
  addon: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.string,
  ]),
  type: PropTypes.string.isRequired,
};

export default InputsIndex;
export {
  InputAddonWithErrors,
  InputCheckboxWithErrors,
  InputEmailWithErrors,
  InputNumberWithErrors,
  InputPasswordWithErrors,
  InputSearchWithErrors,
  InputSelectWithErrors,
  InputTextWithErrors,
  InputTextAreaWithErrors,
  InputToggleWithErrors,
};
