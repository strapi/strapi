import { useContext, useMemo } from 'react';

import EditViewDataManagerContext from '../../../contexts/EditViewDataManager';

function useSelect(name) {
  const { isCreatingEntry, createActionAllowedFields } = useContext(EditViewDataManagerContext);

  const isFieldAllowed = useMemo(() => {
    const allowedFields = isCreatingEntry ? createActionAllowedFields : [];

    return allowedFields.includes(name);
  }, [isCreatingEntry, createActionAllowedFields, name]);

  return {
    isFieldAllowed,
  };
}

export default useSelect;
