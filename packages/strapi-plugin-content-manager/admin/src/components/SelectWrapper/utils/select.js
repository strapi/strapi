import { useMemo } from 'react';
import useDataManager from '../../../hooks/useDataManager';

function useSelect({ isUserAllowedToEditField, name }) {
  const {
    isCreatingEntry,
    createActionAllowedFields,
    updateActionAllowedFields,
  } = useDataManager();

  const isFieldAllowed = useMemo(() => {
    if (isUserAllowedToEditField === true) {
      return true;
    }

    const allowedFields = isCreatingEntry ? createActionAllowedFields : updateActionAllowedFields;

    return allowedFields.includes(name);
  }, [
    isCreatingEntry,
    createActionAllowedFields,
    name,
    isUserAllowedToEditField,
    updateActionAllowedFields,
  ]);

  return {
    isFieldAllowed,
  };
}

export default useSelect;
