import React, { memo, Suspense, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import get from 'lodash/get';
import omit from 'lodash/omit';
import take from 'lodash/take';
import isEqual from 'react-fast-compare';
import {
  GenericInput,
  NotAllowedInput,
  LoadingIndicatorPage,
  useLibrary,
  useCustomFields,
} from '@strapi/helper-plugin';
import { useContentTypeLayout } from '../../hooks';
import { getFieldName } from '../../utils';
import Wysiwyg from '../Wysiwyg';
import InputJSON from '../InputJSON';
import InputUID from '../InputUID';
import SelectWrapper from '../SelectWrapper';

import {
  connect,
  generateOptions,
  getInputType,
  getStep,
  select,
  VALIDATIONS_TO_OMIT,
} from './utils';
import InputLoader from './InputLoader';

function Inputs({
  allowedFields,
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
}) {
  const { fields } = useLibrary();
  const { formatMessage } = useIntl();
  const { contentType: currentContentTypeLayout } = useContentTypeLayout();
  const customFieldsRegistry = useCustomFields();

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
    return getStep(type);
  }, [type]);

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
      <SelectWrapper
        {...metadatas}
        {...fieldSchema}
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
        value={value}
        error={error && formatMessage(error)}
      />
    );
  }

  const customInputs = {
    json: InputJSON,
    uid: InputUID,
    media: fields.media,
    wysiwyg: Wysiwyg,
    ...fields,
  };

  if (customFieldUid) {
    const customField = customFieldsRegistry.get(customFieldUid);
    // const CustomFieldInput = TestColorPicker;
    const CustomFieldInput = (props) => (
      <InputLoader component={customField.components.Input} {...props} />
    );
    customInputs[customFieldUid] = CustomFieldInput;
  }

  return (
    <Suspense fallback={<LoadingIndicatorPage />}>
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
        customFieldUid={customFieldUid}
        customInputs={customInputs}
        multiple={fieldSchema.multiple || false}
        name={keys}
        onChange={onChange}
        options={options}
        placeholder={placeholder ? { id: placeholder, defaultMessage: placeholder } : null}
        required={fieldSchema.required || false}
        step={step}
        type={inputType}
        // validations={validations}
        value={inputValue}
        withDefaultValue={false}
      />
    </Suspense>
  );
}

Inputs.defaultProps = {
  formErrors: {},
  labelAction: undefined,
  queryInfos: {},
  value: null,
};

Inputs.propTypes = {
  allowedFields: PropTypes.array.isRequired,
  fieldSchema: PropTypes.object.isRequired,
  formErrors: PropTypes.object,
  keys: PropTypes.string.isRequired,
  isCreatingEntry: PropTypes.bool.isRequired,
  labelAction: PropTypes.element,
  metadatas: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  readableFields: PropTypes.array.isRequired,
  shouldNotRunValidations: PropTypes.bool.isRequired,
  queryInfos: PropTypes.shape({
    containsKey: PropTypes.string,
    defaultParams: PropTypes.object,
    endPoint: PropTypes.string,
  }),
  value: PropTypes.any,
};

const Memoized = memo(Inputs, isEqual);

export default connect(Memoized, select);
