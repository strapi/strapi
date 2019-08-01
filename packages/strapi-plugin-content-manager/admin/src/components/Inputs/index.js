import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { get, omit } from 'lodash';

import { InputsIndex } from 'strapi-helper-plugin';
import { useEditView } from '../../contexts/EditView';
import InputJSONWithErrors from '../InputJSONWithErrors';
import WysiwygWithErrors from '../WysiwygWithErrors';

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
    case 'media':
    case 'file':
    case 'files':
      return 'file';
    case 'json':
      return 'json';
    case 'wysiwyg':
    case 'WYSIWYG':
    case 'richtext':
      return 'wysiwyg';
    default:
      return 'text';
  }
};

function Inputs({ autoFocus, keys, layout, modifiedData, name, onChange }) {
  const { didCheckErrors, errors } = useEditView();
  const attribute = useMemo(
    () => get(layout, ['schema', 'attributes', name], {}),
    [layout, name]
  );
  const metadatas = useMemo(
    () => get(layout, ['metadatas', name, 'edit'], {}),
    [layout, name]
  );
  const disabled = useMemo(() => !get(metadatas, 'editable', true), [
    metadatas,
  ]);
  const type = useMemo(() => get(attribute, 'type', null), [attribute]);
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
  const { description, visible } = metadatas;
  const value = get(modifiedData, keys);

  if (visible === false) {
    return null;
  }
  const inputErrors = get(errors, keys, []);
  const withOptionPlaceholder = get(attribute, 'type', '') === 'enumeration';

  return (
    <InputsIndex
      {...metadatas}
      autoFocus={autoFocus}
      didCheckErrors={didCheckErrors}
      disabled={disabled}
      errors={inputErrors}
      inputDescription={description}
      inputStyle={inputStyle}
      customInputs={{
        json: InputJSONWithErrors,
        wysiwyg: WysiwygWithErrors,
      }}
      multiple={get(attribute, 'multiple', false)}
      name={name}
      onChange={onChange}
      selectOptions={get(attribute, 'enum', [])}
      type={getInputType(type)}
      validations={validations}
      value={value}
      withOptionPlaceholder={withOptionPlaceholder}
    />
  );
}

Inputs.defaultProps = {
  autoFocus: false,
};

Inputs.propTypes = {
  autoFocus: PropTypes.bool,
  keys: PropTypes.string.isRequired,
  layout: PropTypes.object.isRequired,
  modifiedData: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default memo(Inputs);
