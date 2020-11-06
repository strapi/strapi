import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { get, omit, take } from 'lodash';
import isEqual from 'react-fast-compare';
import { useIntl } from 'react-intl';
import { Inputs as InputsIndex } from '@buffetjs/custom';
import { useStrapi } from 'strapi-helper-plugin';
import { useContentTypeLayout } from '../../hooks';
import { getFieldName } from '../../utils';
import InputJSONWithErrors from '../InputJSONWithErrors';
import NotAllowedInput from '../NotAllowedInput';
import SelectWrapper from '../SelectWrapper';
import WysiwygWithErrors from '../WysiwygWithErrors';
import InputUID from '../InputUID';
import {
  connect,
  generateOptions,
  getInputType,
  getStep,
  select,
  VALIDATIONS_TO_OMIT,
} from './utils';

function Inputs({
  allowedFields,
  autoFocus,
  isCreatingEntry,
  keys,
  onBlur,
  formErrors,
  onChange,
  readableFields,
  shouldNotRunValidations,
  queryInfos,
  value,
  fieldSchema,
  metadatas,
}) {
  const {
    strapi: { fieldApi },
  } = useStrapi();
  const { contentType: currentContentTypeLayout } = useContentTypeLayout();
  const { formatMessage } = useIntl();

  const disabled = useMemo(() => !get(metadatas, 'editable', true), [metadatas]);
  const type = fieldSchema.type;

  const errorId = useMemo(() => {
    return get(formErrors, [keys, 'id'], null);
  }, [formErrors, keys]);

  const errorMessage = errorId ? formatMessage({ id: errorId, defaultMessage: errorId }) : null;

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

  const options = useMemo(() => generateOptions(fieldSchema.enum || [], isRequired), [
    fieldSchema,
    isRequired,
  ]);

  const otherFields = useMemo(() => {
    return fieldApi.getFields();
  }, [fieldApi]);

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
          {...fieldSchema}
          isUserAllowedToEditField={isUserAllowedToEditField}
          isUserAllowedToReadField={isUserAllowedToReadField}
          name={keys}
          queryInfos={queryInfos}
          value={value}
        />
      </div>
    );
  }

  return (
    <InputsIndex
      {...metadatas}
      autoComplete="new-password"
      autoFocus={autoFocus}
      disabled={shouldDisableField}
      error={errorMessage}
      inputDescription={description}
      description={description}
      contentTypeUID={currentContentTypeLayout.uid}
      customInputs={{
        json: InputJSONWithErrors,
        wysiwyg: WysiwygWithErrors,
        uid: InputUID,
        ...otherFields,
      }}
      multiple={fieldSchema.multiple || false}
      attribute={fieldSchema}
      name={keys}
      onBlur={onBlur}
      onChange={onChange}
      options={options}
      step={step}
      type={inputType}
      validations={validations}
      value={inputValue}
      withDefaultValue={false}
    />
  );
}

Inputs.defaultProps = {
  autoFocus: false,

  formErrors: {},
  onBlur: null,
  queryInfos: {},
  value: null,
};

Inputs.propTypes = {
  allowedFields: PropTypes.array.isRequired,
  autoFocus: PropTypes.bool,
  fieldSchema: PropTypes.object.isRequired,
  keys: PropTypes.string.isRequired,
  isCreatingEntry: PropTypes.bool.isRequired,
  formErrors: PropTypes.object,
  metadatas: PropTypes.object.isRequired,
  onBlur: PropTypes.func,
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
