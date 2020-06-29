import { useMemo } from 'react';
import { get } from 'lodash';
import useDataManager from '../../../hooks/useDataManager';

function useSelect(keys) {
  const {
    createActionAllowedFields,
    formErrors,
    isCreatingEntry,
    modifiedData,
    onChange,
    readActionAllowedFields,
    updateActionAllowedFields,
  } = useDataManager();

  const allowedFields = useMemo(() => {
    return isCreatingEntry ? createActionAllowedFields : updateActionAllowedFields;
  }, [isCreatingEntry, createActionAllowedFields, updateActionAllowedFields]);

  const readableFields = useMemo(() => {
    return isCreatingEntry ? [] : readActionAllowedFields;
  }, [isCreatingEntry, readActionAllowedFields]);

  const value = get(modifiedData, keys, null);

  return {
    allowedFields,
    formErrors,
    isCreatingEntry,
    onChange,
    readableFields,
    value,
  };
}

export default useSelect;
