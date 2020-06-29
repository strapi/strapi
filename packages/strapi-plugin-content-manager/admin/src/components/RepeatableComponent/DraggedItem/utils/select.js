import { useMemo } from 'react';
import { get } from 'lodash';
import useDataManager from '../../../../hooks/useDataManager';

function useSelect({ schema, componentFieldName }) {
  const {
    checkFormErrors,
    modifiedData,
    moveComponentField,
    removeRepeatableField,
    triggerFormValidation,
  } = useDataManager();

  const mainField = useMemo(() => get(schema, ['settings', 'mainField'], 'id'), [schema]);
  const displayedValue = get(modifiedData, [...componentFieldName.split('.'), mainField], '');

  return {
    displayedValue,
    mainField,
    checkFormErrors,
    moveComponentField,
    removeRepeatableField,
    triggerFormValidation,
  };
}

export default useSelect;
