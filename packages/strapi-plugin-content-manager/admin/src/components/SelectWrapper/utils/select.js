import { useMemo } from 'react';
import useDataManager from '../../../hooks/useDataManager';

function useSelect({ isUserAllowedToEditField, name }) {
  const { isCreatingEntry, createActionAllowedFields } = useDataManager();

  const isFieldAllowed = useMemo(() => {
    if (isUserAllowedToEditField === true) {
      return true;
    }

    const allowedFields = isCreatingEntry ? createActionAllowedFields : [];

    return allowedFields.includes(name);
  }, [isCreatingEntry, createActionAllowedFields, name, isUserAllowedToEditField]);

  return {
    isFieldAllowed,
  };
}

export default useSelect;
