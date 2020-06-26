import { useContext, useMemo } from 'react';

import EditViewDataManagerContext from '../../../contexts/EditViewDataManager';

function useSelect({ isUserAllowedToEditField, name }) {
  const { isCreatingEntry, createActionAllowedFields } = useContext(EditViewDataManagerContext);

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
