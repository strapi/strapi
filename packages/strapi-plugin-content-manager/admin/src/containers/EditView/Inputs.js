import React from 'react';
import PropTypes from 'prop-types';
import { get, omit } from 'lodash';

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

function Inputs({ keys, layout, modifiedData, name, onChange }) {
  const attribute = get(layout, ['schema', 'attributes', name], {});
  const { model, collection } = attribute;
  const isMedia =
    get(attribute, 'plugin', '') === 'upload' &&
    (model || collection) === 'file';
  const multiple = collection == 'file';
  const metadata = get(layout, ['metadata', name, 'edit'], {});
  const type = isMedia ? 'file' : get(attribute, 'type', null);
  const inputStyle = type === 'text' ? { height: '196px' } : {};
  const validations = omit(attribute, [
    'type',
    'model',
    'via',
    'collection',
    'default',
    'plugin',
    'enum',
  ]);
  const { description, visible } = metadata;
  const value = get(modifiedData, keys);

  if (visible === false) {
    return null;
  }

  return (
    <InputsIndex
      {...metadata}
      inputDescription={description}
      inputStyle={inputStyle}
      customInputs={{ json: InputJSONWithErrors, wysiwyg: WysiwygWithErrors }}
      multiple={multiple}
      name={name}
      onChange={onChange}
      selectOptions={get(attribute, 'enum', [])}
      type={getInputType(type)}
      validations={validations}
      value={value}
    />
  );
}

Inputs.propTypes = {
  keys: PropTypes.string.isRequired,
  layout: PropTypes.object.isRequired,
  modifiedData: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default Inputs;
