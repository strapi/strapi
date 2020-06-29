import { useMemo } from 'react';
import { get } from 'lodash';
import useDataManager from '../../../hooks/useDataManager';

function useSelect({ isFromDynamicZone, name }) {
  const {
    createActionAllowedFields,
    isCreatingEntry,
    modifiedData,
    removeComponentFromField,
    readActionAllowedFields,
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

  const hasChildrenReadableFields = useMemo(() => {
    if (isFromDynamicZone) {
      return true;
    }

    const allowedFields = isCreatingEntry ? [] : readActionAllowedFields;

    const relatedChildrenAllowedFields = allowedFields
      .map(fieldName => {
        return fieldName.split('.')[0];
      })
      .filter(fieldName => fieldName === name.split('.')[0]);

    return relatedChildrenAllowedFields.length > 0;
  }, [readActionAllowedFields, isFromDynamicZone, name, isCreatingEntry]);

  const isReadOnly = useMemo(() => {
    if (isCreatingEntry) {
      return false;
    }

    if (hasChildrenAllowedFields) {
      return false;
    }

    return hasChildrenReadableFields;
  }, [hasChildrenAllowedFields, hasChildrenReadableFields, isCreatingEntry]);

  return {
    hasChildrenAllowedFields,
    hasChildrenReadableFields,
    isCreatingEntry,
    isReadOnly,
    removeComponentFromField,
    componentValue,
  };
}

export default useSelect;
