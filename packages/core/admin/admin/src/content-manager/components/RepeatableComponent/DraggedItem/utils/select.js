import { useMemo } from 'react';
import { get, toString } from 'lodash';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

function useSelect({ schema, componentFieldName }) {
  const { modifiedData, removeRepeatableField, triggerFormValidation } = useCMEditViewDataManager();

  const mainField = useMemo(() => get(schema, ['settings', 'mainField'], 'id'), [schema]);
  const displayedValue = toString(
    get(modifiedData, [...componentFieldName.split('.'), mainField], '')
  );

  return {
    displayedValue,
    mainField,
    removeRepeatableField,
    schema,
    triggerFormValidation,
  };
}

export default useSelect;
