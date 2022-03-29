import { useMemo } from 'react';
import { get, toString } from 'lodash';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

export function getDisplayedValue(modifiedData, componentFieldPath, mainField) {
  return toString(get(modifiedData, [...componentFieldPath, mainField], ''));
}

function useMainValue(schema, componentFieldPath) {
  const { modifiedData } = useCMEditViewDataManager();

  const mainField = useMemo(() => get(schema, ['settings', 'mainField'], 'id'), [schema]);
  let displayedValue = getDisplayedValue(modifiedData, componentFieldPath, mainField);

  return displayedValue;
}

export default useMainValue;
