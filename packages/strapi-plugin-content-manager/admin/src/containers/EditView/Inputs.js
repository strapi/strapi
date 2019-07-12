import React from 'react';
import PropTypes from 'prop-types';

import { InputsIndex } from 'strapi-helper-plugin';

import InputJSONWithErrors from '../../components/InputJSONWithErrors';
import WysiwygWithErrors from '../../components/WysiwygWithErrors';

const getInputType = (type = '') => {
  switch (type.toLowerCase()) {
    case 'boolean':
      return 'toggle';
    case 'biginteger':
    case 'decimal':
    case 'float':
    case 'integer':
      return 'number';
    case 'date':
    case 'datetime':
      return 'date';
    case 'email':
      return 'email';
    case 'enumeration':
      return 'select';
    case 'password':
      return 'password';
    case 'string':
      return 'text';
    case 'text':
      return 'textarea';
    case 'file':
    case 'files':
      return 'file';
    case 'json':
      return 'json';
    default:
      return 'text';
  }
};

function Inputs(props) {
  return (
    <InputsIndex
      {...props}
      type={getInputType(props.type)}
      customInputs={{ json: InputJSONWithErrors, wysiwyg: WysiwygWithErrors }}
    />
  );
}

Inputs.propTypes = {
  type: PropTypes.string.isRequired,
};

export default Inputs;
