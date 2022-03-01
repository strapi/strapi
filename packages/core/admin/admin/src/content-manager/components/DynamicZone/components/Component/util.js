import { useMemo } from 'react';
import { get, toString } from 'lodash';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

function useMainValue(schema, componentFieldPath) {
  const { modifiedData } = useCMEditViewDataManager();

  const mainField = useMemo(() => get(schema, ['settings', 'mainField'], 'id'), [schema]);
  let displayedValue = toString(get(modifiedData, [...componentFieldPath, mainField], ''));

  if (displayedValue.length > 50) {
    displayedValue = `${displayedValue.substring(0, 50)}...`;
  }

  return displayedValue;
}

export default useMainValue;
