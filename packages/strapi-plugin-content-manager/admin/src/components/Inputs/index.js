import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { get, isEmpty, omit, toLower } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { Inputs as InputsIndex } from '@buffetjs/custom';

import useDataManager from '../../hooks/useDataManager';
import InputJSONWithErrors from '../InputJSONWithErrors';
import InputFileWithErrors from '../InputFileWithErrors';
import SelectWrapper from '../SelectWrapper';
import WysiwygWithErrors from '../WysiwygWithErrors';
import InputUID from '../InputUID';

const getInputType = (type = '') => {
  switch (toLower(type)) {
    case 'boolean':
      return 'bool';
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
    case 'uid':
      return 'uid';
    default:
      return 'text';
  }
};

function Inputs({ autoFocus, keys, layout, name, onBlur }) {
  const { didCheckErrors, formErrors, modifiedData, onChange } = useDataManager();
  const attribute = useMemo(() => get(layout, ['schema', 'attributes', name], {}), [layout, name]);
  const metadatas = useMemo(() => get(layout, ['metadatas', name, 'edit'], {}), [layout, name]);
  const disabled = useMemo(() => !get(metadatas, 'editable', true), [metadatas]);
  const type = useMemo(() => get(attribute, 'type', null), [attribute]);
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
  const temporaryErrorIdUntilBuffetjsSupportsFormattedMessage = 'app.utils.defaultMessage';
  const errorId = get(
    formErrors,
    [keys, 'id'],
    temporaryErrorIdUntilBuffetjsSupportsFormattedMessage
  );
  const isRequired = get(validations, ['required'], false);

  if (type === 'relation') {
    return (
      <div key={keys}>
        <SelectWrapper
          {...metadatas}
          name={keys}
          plugin={attribute.plugin}
          relationType={attribute.relationType}
          targetModel={attribute.targetModel}
          value={get(modifiedData, keys)}
        />
      </div>
    );
  }

  let inputValue = value;

  // Fix for input file multipe
  if (type === 'media' && !value) {
    inputValue = [];
  }

  let step;

  if (type === 'float' || type === 'decimal') {
    step = 'any';
  } else if (type === 'time' || type === 'datetime') {
    step = 30;
  } else {
    step = '1';
  }

  const options = get(attribute, 'enum', []).map(v => {
    return (
      <option key={v} value={v}>
        {v}
      </option>
    );
  });

  const enumOptions = [
    <FormattedMessage id="components.InputSelect.option.placeholder" key="__enum_option_null">
      {msg => (
        <option disabled={isRequired} hidden={isRequired} value="">
          {msg}
        </option>
      )}
    </FormattedMessage>,
    ...options,
  ];

  return (
    <FormattedMessage id={errorId}>
      {error => {
        return (
          <InputsIndex
            {...metadatas}
            autoComplete="new-password"
            autoFocus={autoFocus}
            didCheckErrors={didCheckErrors}
            disabled={disabled}
            error={
              isEmpty(error) || errorId === temporaryErrorIdUntilBuffetjsSupportsFormattedMessage
                ? null
                : error
            }
            inputDescription={description}
            description={description}
            contentTypeUID={layout.uid}
            customInputs={{
              media: InputFileWithErrors,
              json: InputJSONWithErrors,
              wysiwyg: WysiwygWithErrors,
              uid: InputUID,
            }}
            multiple={get(attribute, 'multiple', false)}
            attribute={attribute}
            name={keys}
            onBlur={onBlur}
            onChange={onChange}
            options={enumOptions}
            step={step}
            type={getInputType(type)}
            validations={validations}
            value={inputValue}
            withDefaultValue={false}
          />
        );
      }}
    </FormattedMessage>
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
