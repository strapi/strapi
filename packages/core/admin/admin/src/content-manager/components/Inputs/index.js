import React, { memo, useMemo } from 'react';

import { GenericInput, NotAllowedInput, useLibrary } from '@strapi/helper-plugin';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import omit from 'lodash/omit';
import take from 'lodash/take';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { useContentTypeLayout } from '../../hooks';
import { getFieldName } from '../../utils';
import InputUID from '../InputUID';
import { RelationInputDataManager } from '../RelationInputDataManager';
import Wysiwyg from '../Wysiwyg';

import { connect, generateOptions, getInputType, select, VALIDATIONS_TO_OMIT } from './utils';

function Inputs({
  allowedFields,
  componentUid,
  fieldSchema,
  formErrors,
  isCreatingEntry,
  keys,
  labelAction,
  metadatas,
  onChange,
  readableFields,
  shouldNotRunValidations,
  queryInfos,
  value,
  size,
  customFieldInputs,
}) {
  const { fields } = useLibrary();
  const { formatMessage } = useIntl();
  const { contentType: currentContentTypeLayout } = useContentTypeLayout();

  const disabled = useMemo(() => !get(metadatas, 'editable', true), [metadatas]);
  const { type, customField: customFieldUid } = fieldSchema;
  const error = get(formErrors, [keys], null);

  const fieldName = useMemo(() => {
    return getFieldName(keys);
  }, [keys]);

  const validations = useMemo(() => {
    const inputValidations = omit(
      fieldSchema,
      shouldNotRunValidations
        ? [...VALIDATIONS_TO_OMIT, 'required', 'minLength']
        : VALIDATIONS_TO_OMIT
    );

    const regexpString = fieldSchema.regex || null;

    if (regexpString) {
      const regexp = new RegExp(regexpString);

      if (regexp) {
        inputValidations.regex = regexp;
      }
    }

    return inputValidations;
  }, [fieldSchema, shouldNotRunValidations]);

  const isRequired = useMemo(() => get(validations, ['required'], false), [validations]);

  const isChildOfDynamicZone = useMemo(() => {
    const attributes = get(currentContentTypeLayout, ['attributes'], {});
    const foundAttributeType = get(attributes, [fieldName[0], 'type'], null);

    return foundAttributeType === 'dynamiczone';
  }, [currentContentTypeLayout, fieldName]);

  const inputType = getInputType(type);

  const inputValue = type === 'media' && !value ? [] : value;

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

  const options = useMemo(
    () => generateOptions(fieldSchema.enum || [], isRequired),
    [fieldSchema, isRequired]
  );

  const { label, description, placeholder, visible } = metadatas;

  if (visible === false) {
    return null;
  }

  if (!shouldDisplayNotAllowedInput) {
    return (
      <NotAllowedInput
        description={description ? { id: description, defaultMessage: description } : null}
        intlLabel={{ id: label, defaultMessage: label }}
        labelAction={labelAction}
        error={error && formatMessage(error)}
        name={keys}
        required={isRequired}
      />
    );
  }

  if (type === 'relation') {
    return (
      <RelationInputDataManager
        {...metadatas}
        {...fieldSchema}
        componentUid={componentUid}
        description={
          metadatas.description
            ? formatMessage({
                id: metadatas.description,
                defaultMessage: metadatas.description,
              })
            : undefined
        }
        intlLabel={{
          id: metadatas.label,
          defaultMessage: metadatas.label,
        }}
        labelAction={labelAction}
        isUserAllowedToEditField={isUserAllowedToEditField}
        isUserAllowedToReadField={isUserAllowedToReadField}
        name={keys}
        placeholder={
          metadatas.placeholder
            ? {
                id: metadatas.placeholder,
                defaultMessage: metadatas.placeholder,
              }
            : null
        }
        queryInfos={queryInfos}
        size={size}
        value={value}
        error={error && formatMessage(error)}
      />
    );
  }

  const customInputs = {
    uid: InputUID,
    media: fields.media,
    wysiwyg: Wysiwyg,
    ...fields,
    ...customFieldInputs,
  };

  return (
    <GenericInput
      attribute={fieldSchema}
      autoComplete="new-password"
      intlLabel={{ id: label, defaultMessage: label }}
      // in case the default value of the boolean is null, attribute.default doesn't exist
      isNullable={inputType === 'bool' && [null, undefined].includes(fieldSchema.default)}
      description={description ? { id: description, defaultMessage: description } : null}
      disabled={shouldDisableField}
      error={error}
      labelAction={labelAction}
      contentTypeUID={currentContentTypeLayout.uid}
      customInputs={customInputs}
      multiple={fieldSchema.multiple || false}
      name={keys}
      onChange={onChange}
      options={options}
      placeholder={placeholder ? { id: placeholder, defaultMessage: placeholder } : null}
      required={fieldSchema.required || false}
      step={getStep(type)}
      type={customFieldUid || inputType}
      // validations={validations}
      value={inputValue}
      withDefaultValue={false}
    />
  );
}

Inputs.defaultProps = {
  componentUid: undefined,
  formErrors: {},
  labelAction: undefined,
  size: undefined,
  value: null,
  queryInfos: {},
  customFieldInputs: {},
};

Inputs.propTypes = {
  allowedFields: PropTypes.array.isRequired,
  componentUid: PropTypes.string,
  fieldSchema: PropTypes.object.isRequired,
  formErrors: PropTypes.object,
  keys: PropTypes.string.isRequired,
  isCreatingEntry: PropTypes.bool.isRequired,
  labelAction: PropTypes.element,
  metadatas: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  readableFields: PropTypes.array.isRequired,
  size: PropTypes.number,
  shouldNotRunValidations: PropTypes.bool.isRequired,
  value: PropTypes.any,
  queryInfos: PropTypes.shape({
    containsKey: PropTypes.string,
    defaultParams: PropTypes.object,
    endPoint: PropTypes.string,
  }),
  customFieldInputs: PropTypes.object,
};

const getStep = (type) => {
  switch (type) {
    case 'float':
    case 'decimal':
      return 0.01;
    default:
      return 1;
  }
};

const Memoized = memo(Inputs, isEqual);

export default connect(Memoized, select);
