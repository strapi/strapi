import { useMemo } from 'react';
import { get, toString } from 'lodash';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

function getRelationDisplayValue({ schema, modifiedData, mainField, componentFieldName }) {
  const relationMainFieldName = get(schema, ['metadatas', mainField, 'edit', 'mainField', 'name']);

  return toString(
    get(modifiedData, [...componentFieldName.split('.'), mainField, relationMainFieldName], '')
  );
}

function getStandardDisplayValue({ modifiedData, mainField, componentFieldName }) {
  return toString(get(modifiedData, [...componentFieldName.split('.'), mainField], ''));
}

function useSelect({ schema, componentFieldName }) {
  const {
    checkFormErrors,
    modifiedData,
    moveComponentField,
    removeRepeatableField,
    triggerFormValidation,
  } = useCMEditViewDataManager();

  const mainField = useMemo(() => get(schema, ['settings', 'mainField'], 'id'), [schema]);
  const isMainFieldRelationType = get(schema, ['attributes', mainField, 'type']) === 'relation';

  const displayedValue = isMainFieldRelationType
    ? getRelationDisplayValue({ schema, modifiedData, mainField, componentFieldName })
    : getStandardDisplayValue({ modifiedData, mainField, componentFieldName });

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
