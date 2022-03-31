import { useMemo } from 'react';
import get from 'lodash/get';
import toString from 'lodash/toString';
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
