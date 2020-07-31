import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { get, isEmpty, omit, toLower, take } from 'lodash';
import isEqual from 'react-fast-compare';
import { FormattedMessage } from 'react-intl';
import { Inputs as InputsIndex } from '@buffetjs/custom';
import { useStrapi } from 'strapi-helper-plugin';
import useEditView from '../../hooks/useEditView';
import { getFieldName } from '../../utils';
import InputJSONWithErrors from '../InputJSONWithErrors';
import NotAllowedInput from '../NotAllowedInput';
import SelectWrapper from '../SelectWrapper';
import WysiwygWithErrors from '../WysiwygWithErrors';
import InputUID from '../InputUID';
import { connect, select } from './utils';

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

function Inputs({
  allowedFields,
  autoFocus,
  componentUid,
  isCreatingEntry,
  keys,
  layout,
  name,
  onBlur,
  formErrors,
  onChange,
  readableFields,
  value,
}) {
  const {
    strapi: { fieldApi },
  } = useStrapi();
  const { layout: currentContentTypeLayout } = useEditView();

  const attribute = useMemo(() => get(layout, ['schema', 'attributes', name], {}), [layout, name]);
  const metadatas = useMemo(() => get(layout, ['metadatas', name, 'edit'], {}), [layout, name]);
  const disabled = useMemo(() => !get(metadatas, 'editable', true), [metadatas]);
  const type = useMemo(() => get(attribute, 'type', null), [attribute]);
  const regexpString = useMemo(() => get(attribute, 'regex', null), [attribute]);
  const temporaryErrorIdUntilBuffetjsSupportsFormattedMessage = 'app.utils.defaultMessage';
  const errorId = useMemo(() => {
    return get(formErrors, [keys, 'id'], temporaryErrorIdUntilBuffetjsSupportsFormattedMessage);
  }, [formErrors, keys]);

  const fieldName = useMemo(() => {
    return getFieldName(keys);
  }, [keys]);

  const isChildOfDynamicZone = useMemo(() => {
    const attributes = get(currentContentTypeLayout, ['schema', 'attributes'], {});
    const foundAttributeType = get(attributes, [fieldName[0], 'type'], null);

    return foundAttributeType === 'dynamiczone';
  }, [currentContentTypeLayout, fieldName]);
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
      step = 0.1;
    } else if (type === 'time' || type === 'datetime') {
      step = 30;
    } else {
      step = 1;
    }

    return step;
  }, [type]);

  const isMultiple = useMemo(() => {
    return get(attribute, 'multiple', false);
  }, [attribute]);

  const isUserAllowedToEditField = useMemo(() => {
    const joinedName = fieldName.join('.');

    if (allowedFields.includes(joinedName)) {
      return true;
    }

    if (isChildOfDynamicZone) {
      return allowedFields.includes(fieldName[0]);
    }

    const isChildOfComponent = fieldName.length > 1;

    if (isChildOfComponent) {
      const parentFieldName = take(fieldName, fieldName.length - 1).join('.');

      return allowedFields.includes(parentFieldName);
    }

    return false;
  }, [allowedFields, fieldName, isChildOfDynamicZone]);

  const isUserAllowedToReadField = useMemo(() => {
    const joinedName = fieldName.join('.');

    if (readableFields.includes(joinedName)) {
      return true;
    }

    if (isChildOfDynamicZone) {
      return readableFields.includes(fieldName[0]);
    }

    const isChildOfComponent = fieldName.length > 1;

    if (isChildOfComponent) {
      const parentFieldName = take(fieldName, fieldName.length - 1).join('.');

      return readableFields.includes(parentFieldName);
    }

    return false;
  }, [readableFields, fieldName, isChildOfDynamicZone]);

  const shouldDisplayNotAllowedInput = useMemo(() => {
    return isUserAllowedToReadField || isUserAllowedToEditField;
  }, [isUserAllowedToEditField, isUserAllowedToReadField]);

  const shouldDisableField = useMemo(() => {
    if (!isCreatingEntry) {
      const doesNotHaveRight = isUserAllowedToReadField && !isUserAllowedToEditField;

      if (doesNotHaveRight) {
        return true;
      }

      return disabled;
    }

    return disabled;
  }, [disabled, isCreatingEntry, isUserAllowedToEditField, isUserAllowedToReadField]);

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

  if (!shouldDisplayNotAllowedInput) {
    return <NotAllowedInput label={metadatas.label} />;
  }

  if (type === 'relation') {
    return (
      <div key={keys}>
        <SelectWrapper
          {...metadatas}
          componentUid={componentUid}
          isUserAllowedToEditField={isUserAllowedToEditField}
          isUserAllowedToReadField={isUserAllowedToReadField}
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
    <FormattedMessage id={errorId} defaultMessage={errorId}>
      {error => {
        return (
          <InputsIndex
            {...metadatas}
            autoComplete="new-password"
            autoFocus={autoFocus}
            disabled={shouldDisableField}
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
  componentUid: null,
  formErrors: {},
  onBlur: null,
  value: null,
};

Inputs.propTypes = {
  allowedFields: PropTypes.array.isRequired,
  autoFocus: PropTypes.bool,
  componentUid: PropTypes.string,
  keys: PropTypes.string.isRequired,
  layout: PropTypes.object.isRequired,
  isCreatingEntry: PropTypes.bool.isRequired,
  formErrors: PropTypes.object,
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  readableFields: PropTypes.array.isRequired,
  value: PropTypes.any,
};

const Memoized = memo(Inputs, isEqual);

export default connect(Memoized, select);
