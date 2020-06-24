import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { get, isEmpty, omit, toLower } from 'lodash';
import isEqual from 'react-fast-compare';
import { FormattedMessage } from 'react-intl';
import { Inputs as InputsIndex } from '@buffetjs/custom';
import { useStrapi } from 'strapi-helper-plugin';

import InputJSONWithErrors from '../InputJSONWithErrors';
import SelectWrapper from '../SelectWrapper';
import WysiwygWithErrors from '../WysiwygWithErrors';
import InputUID from '../InputUID';
import connect from './utils/connect';
import select from './utils/select';

const getInputType = (type = '') => {
  switch (toLower(type)) {
    case 'boolean':
      return 'bool';
    case 'biginteger':
      return 'text';
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
      return type || 'text';
  }
};

const validationsToOmit = [
  'type',
  'model',
  'via',
  'collection',
  'default',
  'plugin',
  'enum',
  'regex',
];

function Inputs({ autoFocus, keys, layout, name, onBlur, formErrors, onChange, value }) {
  const {
    strapi: { fieldApi },
  } = useStrapi();
  // const { didCheckErrors, formErrors, modifiedData, onChange } = useDataManager();
  const attribute = useMemo(() => get(layout, ['schema', 'attributes', name], {}), [layout, name]);
  const metadatas = useMemo(() => get(layout, ['metadatas', name, 'edit'], {}), [layout, name]);
  const disabled = useMemo(() => !get(metadatas, 'editable', true), [metadatas]);
  const type = useMemo(() => get(attribute, 'type', null), [attribute]);
  const regexpString = useMemo(() => get(attribute, 'regex', null), [attribute]);
  // const value = useMemo(() => get(modifiedData, keys, null), [keys, modifiedData]);
  const temporaryErrorIdUntilBuffetjsSupportsFormattedMessage = 'app.utils.defaultMessage';
  const errorId = useMemo(() => {
    return get(formErrors, [keys, 'id'], temporaryErrorIdUntilBuffetjsSupportsFormattedMessage);
  }, [formErrors, keys]);

  const validations = useMemo(() => omit(attribute, validationsToOmit), [attribute]);

  const isRequired = useMemo(() => get(validations, ['required'], false), [validations]);

  const inputType = useMemo(() => {
    return getInputType(type);
  }, [type]);

  const inputValue = useMemo(() => {
    // Fix for input file multipe
    if (type === 'media' && !value) {
      return [];
    }

    return value;
  }, [type, value]);

  const step = useMemo(() => {
    let step;

    if (type === 'float' || type === 'decimal') {
      step = 'any';
    } else if (type === 'time' || type === 'datetime') {
      step = 30;
    } else {
      step = '1';
    }

    return step;
  }, [type]);

  const isMultiple = useMemo(() => {
    return get(attribute, 'multiple', false);
  }, [attribute]);

  const options = useMemo(() => {
    return get(attribute, 'enum', []).map(v => {
      return (
        <option key={v} value={v}>
          {v}
        </option>
      );
    });
  }, [attribute]);

  const otherFields = useMemo(() => {
    return fieldApi.getFields();
  }, [fieldApi]);

  if (regexpString) {
    const regexp = new RegExp(regexpString);

    if (regexp) {
      validations.regex = regexp;
    }
  }

  const { description, visible } = metadatas;

  if (visible === false) {
    return null;
  }

  if (type === 'relation') {
    return (
      <div key={keys}>
        <SelectWrapper
          {...metadatas}
          name={keys}
          plugin={attribute.plugin}
          relationType={attribute.relationType}
          targetModel={attribute.targetModel}
          value={value}
        />
      </div>
    );
  }

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
            // didCheckErrors={didCheckErrors}
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
              json: InputJSONWithErrors,
              wysiwyg: WysiwygWithErrors,
              uid: InputUID,
              ...otherFields,
            }}
            multiple={isMultiple}
            attribute={attribute}
            name={keys}
            onBlur={onBlur}
            onChange={onChange}
            options={enumOptions}
            step={step}
            type={inputType}
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
  formErrors: {},
  onBlur: null,
  value: null,
};

Inputs.propTypes = {
  autoFocus: PropTypes.bool,
  keys: PropTypes.string.isRequired,
  layout: PropTypes.object.isRequired,
  formErrors: PropTypes.object,
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.any,
};

const Memoized = memo(Inputs, isEqual);

export default connect(Memoized, select);
