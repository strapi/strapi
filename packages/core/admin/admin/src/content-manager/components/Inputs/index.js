import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import omit from 'lodash/omit';
import take from 'lodash/take';
import isEqual from 'react-fast-compare';
import { useIntl } from 'react-intl';
// import { Inputs as InputsIndex } from '@buffetjs/custom';
// import { NotAllowedInput, useLibrary } from '@strapi/helper-plugin';
import { useContentTypeLayout } from '../../hooks';
import { getFieldName } from '../../utils';
import GenericInput from './GenericInput';
// import InputJSONWithErrors from '../InputJSONWithErrors';
// import SelectWrapper from '../SelectWrapper';
// import WysiwygWithErrors from '../WysiwygWithErrors';
// import InputUID from '../InputUID';
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
  fieldSchema,
  formErrors,
  isCreatingEntry,
  keys,
  labelIcon,
  metadatas,
  onBlur,
  onChange,
  readableFields,
  shouldNotRunValidations,
  // queryInfos,
  value,
}) {
  // const { fields } = useLibrary();

  const { contentType: currentContentTypeLayout } = useContentTypeLayout();
  const { formatMessage } = useIntl();

  const labelIconformatted = labelIcon
    ? { icon: labelIcon.icon, title: formatMessage(labelIcon.title) }
    : labelIcon;

  const disabled = useMemo(() => !get(metadatas, 'editable', true), [metadatas]);
  const type = fieldSchema.type;

  const errorId = useMemo(() => {
    return get(formErrors, [keys, 'id'], null);
  }, [formErrors, keys]);

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

  const { label, description, visible } = metadatas;

  if (visible === false) {
    return null;
  }

  if (!shouldDisplayNotAllowedInput) {
    return 'NOT ALLOWED INPUT';
    // return (
    //   <NotAllowedInput
    //     label={metadatas.label}
    //     labelIcon={labelIconformatted}
    //     error={errorMessage}
    //   />
    // );
  }

  if (type === 'relation') {
    return 'RELATION';
    // return (
    //   <div key={keys}>
    //     <SelectWrapper
    //       {...metadatas}
    //       {...fieldSchema}
    //       labelIcon={labelIcon}
    //       isUserAllowedToEditField={isUserAllowedToEditField}
    //       isUserAllowedToReadField={isUserAllowedToReadField}
    //       name={keys}
    //       queryInfos={queryInfos}
    //       value={value}
    //     />
    //   </div>
    // );
  }

  return (
    <GenericInput
      // {...metadatas}
      autoComplete="new-password"
      intlLabel={{ id: label, defaultMessage: label }}
      // autoFocus={autoFocus}
      description={description ? { id: description, defaultMessage: description } : null}
      disabled={shouldDisableField}
      error={errorId}
      // inputDescription={description}
      labelIcon={labelIconformatted}
      contentTypeUID={currentContentTypeLayout.uid}
      customInputs={{
        // json: InputJSONWithErrors,
        // wysiwyg: WysiwygWithErrors,
        // uid: InputUID,
        // ...fields,
        media: () => <div>TODO media</div>,
        uid: () => <div>TODO uid</div>,
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
  formErrors: {},
  labelIcon: null,
  onBlur: null,
  queryInfos: {},
  value: null,
};

Inputs.propTypes = {
  allowedFields: PropTypes.array.isRequired,
  fieldSchema: PropTypes.object.isRequired,
  formErrors: PropTypes.object,
  keys: PropTypes.string.isRequired,
  isCreatingEntry: PropTypes.bool.isRequired,
  labelIcon: PropTypes.shape({
    icon: PropTypes.node.isRequired,
    title: PropTypes.shape({
      id: PropTypes.string.isRequired,
      defaultMessage: PropTypes.string.isRequired,
    }).isRequired,
  }),
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
