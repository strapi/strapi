import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { get, omit } from 'lodash';
// import { InputsIndex } from 'strapi-helper-plugin';
import { InputFileWithErrors } from 'strapi-helper-plugin';
import { Inputs as InputsIndex } from '@buffetjs/custom';

import useDataManager from '../../hooks/useDataManager';
import InputJSONWithErrors from '../InputJSONWithErrors';
import WysiwygWithErrors from '../WysiwygWithErrors';

const getInputType = (type = '') => {
  switch (type.toLowerCase()) {
    case 'boolean':
      return 'bool';
    case 'biginteger':
    case 'decimal':
    case 'float':
    case 'integer':
      return 'number';
    case 'date':
    case 'datetime':
    case 'time':
      return type;
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
      return 'media';
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

function Inputs({ autoFocus, keys, name, onBlur }) {
  const {
    didCheckErrors,
    errors,
    layout,
    modifiedData,
    onChange,
  } = useDataManager();
  console.log({ errors });
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

  // const inputStyle = type === 'text' ? { height: '196px' } : {};
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
  const value = get(modifiedData, keys, null);

  if (visible === false) {
    return null;
  }

  // const inputErrors = get(errors, keys, []);
  // const withOptionPlaceholder = get(attribute, 'type', '') === 'enumeration';

  return (
    <InputsIndex
      {...metadatas}
      autoFocus={autoFocus}
      didCheckErrors={didCheckErrors}
      disabled={disabled}
      // errors={errors}
      // errors={inputErrors}
      // inputDescription={description}
      description={description}
      // inputStyle={inputStyle}
      customInputs={{
        media: InputFileWithErrors,
        json: InputJSONWithErrors,
        wysiwyg: WysiwygWithErrors,
      }}
      multiple={get(attribute, 'multiple', false)}
      name={name}
      onBlur={onBlur}
      onChange={onChange}
      options={get(attribute, 'enum', [])}
      type={getInputType(type)}
      // validations={null}
      validations={validations}
      value={value}
      // withOptionPlaceholder={withOptionPlaceholder}
    />
  );
}

Inputs.defaultProps = {
  autoFocus: false,
  onBlur: null,
};

Inputs.propTypes = {
  autoFocus: PropTypes.bool,
  keys: PropTypes.string.isRequired,
  layout: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.func,
  onChange: PropTypes.func.isRequired,
};

export default memo(Inputs);
