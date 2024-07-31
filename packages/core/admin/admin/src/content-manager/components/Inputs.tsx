import * as React from 'react';

import {
  GenericInput,
  NotAllowedInput,
  useCMEditViewDataManager,
  useLibrary,
} from '@strapi/helper-plugin';
import get from 'lodash/get';
import omit from 'lodash/omit';
import take from 'lodash/take';
import { useIntl } from 'react-intl';

import { useContentTypeLayout } from '../hooks/useContentTypeLayout';
import { LazyComponentStore } from '../hooks/useLazyComponents';
import { getFieldName } from '../utils/fields';
import { EditLayoutRow } from '../utils/layouts';

import { BlocksInput } from './BlocksInput/BlocksInput';
import { InputUID } from './InputUID';
import { RelationInputDataManager } from './Relations/RelationInputDataManager';
import { Wysiwyg } from './Wysiwyg/Field';

const VALIDATIONS_TO_OMIT = [
  'type',
  'model',
  'via',
  'collection',
  'default',
  'plugin',
  'enum',
  'regex',
  'pluginOptions',
];

/* -------------------------------------------------------------------------------------------------
 * Inputs
 * -----------------------------------------------------------------------------------------------*/

interface InputProps
  extends Pick<EditLayoutRow, 'fieldSchema' | 'metadatas' | 'queryInfos' | 'size'> {
  componentUid?: string;
  keys: string;
  labelAction?: React.ReactNode;
  customFieldInputs: LazyComponentStore;
}

const Inputs = ({
  componentUid,
  fieldSchema,
  keys,
  labelAction,
  metadatas,
  queryInfos,
  size,
  customFieldInputs,
}: InputProps) => {
  const {
    createActionAllowedFields,
    formErrors,
    isCreatingEntry,
    modifiedData,
    onChange,
    readActionAllowedFields,
    shouldNotRunValidations,
    updateActionAllowedFields,
  } = useCMEditViewDataManager();

  const { fields } = useLibrary();
  const { formatMessage } = useIntl();
  const { contentType: currentContentTypeLayout } = useContentTypeLayout();

  const allowedFields = React.useMemo(() => {
    return isCreatingEntry ? createActionAllowedFields : updateActionAllowedFields;
  }, [isCreatingEntry, createActionAllowedFields, updateActionAllowedFields]);

  const readableFields = React.useMemo(() => {
    return isCreatingEntry ? [] : readActionAllowedFields;
  }, [isCreatingEntry, readActionAllowedFields]);

  const value = get(modifiedData, keys, null);

  const disabled = React.useMemo(() => !get(metadatas, 'editable', true), [metadatas]);
  const { type, customField: customFieldUid } = fieldSchema;
  const error = get(formErrors, [keys], undefined);

  const fieldName = getFieldName(keys);

  const validations = React.useMemo(() => {
    const inputValidations = omit(
      fieldSchema,
      shouldNotRunValidations
        ? [...VALIDATIONS_TO_OMIT, 'required', 'minLength']
        : VALIDATIONS_TO_OMIT
    );

    const regexpString = 'regex' in fieldSchema ? fieldSchema.regex : null;

    if (regexpString) {
      const regexp = new RegExp(regexpString);

      if (regexp) {
        // @ts-expect-error – TODO: fix me
        inputValidations.regex = regexp;
      }
    }

    return inputValidations;
  }, [fieldSchema, shouldNotRunValidations]);

  const isRequired = React.useMemo(() => get(validations, ['required'], false), [validations]);

  const isChildOfDynamicZone = React.useMemo(() => {
    const attributes = get(currentContentTypeLayout, ['attributes'], {});
    const foundAttributeType = get(attributes, [fieldName[0], 'type'], null);

    return foundAttributeType === 'dynamiczone';
  }, [currentContentTypeLayout, fieldName]);

  const inputType = getInputType(type);

  const inputValue = type === 'media' && !value ? [] : value;

  const isUserAllowedToEditField = React.useMemo(() => {
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

  const isUserAllowedToReadField = React.useMemo(() => {
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

  const shouldDisplayNotAllowedInput = isUserAllowedToReadField || isUserAllowedToEditField;

  const shouldDisableField = React.useMemo(() => {
    if (!isCreatingEntry) {
      const doesNotHaveRight = isUserAllowedToReadField && !isUserAllowedToEditField;

      if (doesNotHaveRight) {
        return true;
      }

      return disabled;
    }

    return disabled;
  }, [disabled, isCreatingEntry, isUserAllowedToEditField, isUserAllowedToReadField]);

  const options = [
    {
      metadatas: {
        intlLabel: {
          id: 'components.InputSelect.option.placeholder',
          defaultMessage: 'Choose here',
        },
        disabled: isRequired,
        hidden: isRequired,
      },
      key: '__enum_option_null',
      value: '',
    },
    // @ts-expect-error – TODO: fix me
    ...(fieldSchema.enum ?? []).map((option) => {
      return {
        metadatas: {
          intlLabel: {
            id: option,
            defaultMessage: option,
          },
          hidden: false,
          disabled: false,
        },
        key: option,
        value: option,
      };
    }),
  ];

  const { label, description, placeholder, visible } = metadatas;

  if (visible === false) {
    return null;
  }

  if (!shouldDisplayNotAllowedInput) {
    return (
      <NotAllowedInput
        description={description ? { id: description, defaultMessage: description } : undefined}
        intlLabel={{ id: label, defaultMessage: label }}
        labelAction={labelAction}
        error={error ? formatMessage(error) : undefined}
        name={keys}
      />
    );
  }

  if (type === 'relation') {
    return (
      // @ts-expect-error – TODO: fix this, it won't work because you assume too much based off it's type so you can't narrow everything else down.
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
            : undefined
        }
        queryInfos={queryInfos ?? {}}
        size={size}
        error={error ? formatMessage(error) : undefined}
      />
    );
  }

  const customInputs = {
    uid: InputUID,
    media: fields!.media,
    wysiwyg: Wysiwyg,
    blocks: BlocksInput,
    ...fields,
    ...customFieldInputs,
  };

  return (
    <GenericInput
      attribute={fieldSchema}
      autoComplete="new-password"
      intlLabel={{ id: label, defaultMessage: label }}
      // in case the default value of the boolean is null, attribute.default doesn't exist
      isNullable={
        inputType === 'bool' &&
        'default' in fieldSchema &&
        (fieldSchema.default === null || fieldSchema.default === undefined)
      }
      description={description ? { id: description, defaultMessage: description } : undefined}
      disabled={shouldDisableField}
      error={error}
      labelAction={labelAction}
      contentTypeUID={currentContentTypeLayout!.uid}
      // @ts-expect-error – TODO: fix this later...
      customInputs={customInputs}
      multiple={'multiple' in fieldSchema ? fieldSchema.multiple : false}
      name={keys}
      // @ts-expect-error – TODO: fix this later...
      onChange={onChange}
      options={options}
      placeholder={placeholder ? { id: placeholder, defaultMessage: placeholder } : undefined}
      required={fieldSchema.required || false}
      step={getStep(type)}
      type={customFieldUid || inputType}
      // validations={validations}
      value={inputValue}
      withDefaultValue={false}
    />
  );
};

const getStep = (type: string) => {
  switch (type) {
    case 'float':
    case 'decimal':
      return 0.01;
    default:
      return 1;
  }
};

const getInputType = (type = '') => {
  switch (type.toLowerCase()) {
    case 'blocks':
      return 'blocks';
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

export { Inputs };
