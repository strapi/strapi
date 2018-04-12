/**
 *
 * InputsIndex references all the input with errors available
 */

/* eslint-disable react/require-default-props */
import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import Loadable from 'react-loadable';
// Design
import InputAddonWithErrors from 'components/InputAddonWithErrors';
import InputCheckboxWithErrors from 'components/InputCheckboxWithErrors';
import InputDateWithErrors from 'components/InputDateWithErrors';
import InputEmailWithErrors from 'components/InputEmailWithErrors';
import InputFileWithErrors from 'components/InputFileWithErrors';
import InputNumberWithErrors from 'components/InputNumberWithErrors';
import InputSearchWithErrors from 'components/InputSearchWithErrors';
import InputSelectWithErrors from 'components/InputSelectWithErrors';
import InputPasswordWithErrors from 'components/InputPasswordWithErrors';
import InputTextAreaWithErrors from 'components/InputTextAreaWithErrors';
import InputTextWithErrors from 'components/InputTextWithErrors';
import InputToggleWithErrors from 'components/InputToggleWithErrors';
// import WysiwygWithErrors from 'components/WysiwygWithErrors';
const Loading = () => <div>Loading ...</div>;
const LoadableWysiwyg = Loadable({
  loader: () => import('components/WysiwygWithErrors'),
  loading: Loading,
});

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
  wysiwyg: LoadableWysiwyg,
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
    default:
      inputValue = props.value || '';
  }

  const Input = inputs[type] ? inputs[type] : DefaultInputError;

  return <Input {...props} value={inputValue} />;
}

DefaultInputError.propTypes = {
  type: PropTypes.string.isRequired,
};

InputsIndex.defaultProps = {
  addon: false,
};

InputsIndex.propTypes = {
  addon: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.string,
  ]),
  type: PropTypes.string.isRequired,
  value: PropTypes.any,
};

export default InputsIndex;
