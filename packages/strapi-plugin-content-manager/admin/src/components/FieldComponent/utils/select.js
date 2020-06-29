import { useMemo } from 'react';
import { get } from 'lodash';
import useDataManager from '../../../hooks/useDataManager';

function useSelect({ isFromDynamicZone, name }) {
  const {
    createActionAllowedFields,
    isCreatingEntry,
    modifiedData,
    removeComponentFromField,
    updateActionAllowedFields,
  } = useDataManager();

  const allowedFields = useMemo(() => {
    return isCreatingEntry ? createActionAllowedFields : updateActionAllowedFields;
  }, [isCreatingEntry, createActionAllowedFields, updateActionAllowedFields]);

  const componentValue = get(modifiedData, name, null);

  const hasChildrenAllowedFields = useMemo(() => {
    if (isFromDynamicZone) {
      return true;
    }

    const relatedChildrenAllowedFields = allowedFields
      .map(fieldName => {
        return fieldName.split('.')[0];
      })
      .filter(fieldName => fieldName === name.split('.')[0]);

    return relatedChildrenAllowedFields.length > 0;
  }, [allowedFields, isFromDynamicZone, name]);

  return {
    hasChildrenAllowedFields,
    removeComponentFromField,
    componentValue,
  };
}

export default useSelect;
