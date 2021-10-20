import { useMemo } from 'react';
import { get, toString } from 'lodash';
import { useContentManagerEditViewDataManager } from 'strapi-helper-plugin';

function useSelect({ schema, componentFieldName }) {
  const {
    checkFormErrors,
    modifiedData,
    moveComponentField,
    removeRepeatableField,
    triggerFormValidation,
  } = useContentManagerEditViewDataManager();

  const mainField = useMemo(() => get(schema, ['settings', 'mainField'], 'id'), [schema]);
  const displayedValue = toString(
    get(modifiedData, [...componentFieldName.split('.'), mainField], '')
  );

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
