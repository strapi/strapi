import { useMemo } from 'react';
import { get, toString } from 'lodash';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

function useSelect({ schema, componentFieldName }) {
  const {
    checkFormErrors,
    modifiedData,
    moveComponentField,
    removeRepeatableField,
    triggerFormValidation,
  } = useCMEditViewDataManager();

  const mainField = useMemo(() => get(schema, ['settings', 'mainField'], 'id'), [schema]);
  const nestedObjectTitle = schema.layouts.edit?.[0]?.[0]?.metadatas?.mainField?.name;
  const nestedObjectField = schema.layouts.edit?.[0]?.[0]?.name;
  const displayValuePath =
    mainField === 'id' && !!nestedObjectTitle
      ? [...componentFieldName.split('.'), nestedObjectField, nestedObjectTitle]
      : [...componentFieldName.split('.'), mainField];
  const displayedValue = toString(get(modifiedData, displayValuePath, ''));

  return {
    displayedValue,
    mainField,
    checkFormErrors,
    moveComponentField,
    removeRepeatableField,
    schema,
    triggerFormValidation,
  };
}

export default useSelect;
