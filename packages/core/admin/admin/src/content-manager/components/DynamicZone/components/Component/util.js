import { useMemo } from 'react';
import { get, toString } from 'lodash';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

function useMainValue(schema, componentFieldName) {
  const { modifiedData } = useCMEditViewDataManager();

  const mainField = useMemo(() => get(schema, ['settings', 'mainField'], 'id'), [schema]);
  const displayedValue = toString(
    get(modifiedData, [...componentFieldName.split('.'), mainField], '')
  );

  return displayedValue;
}

export default useMainValue;
