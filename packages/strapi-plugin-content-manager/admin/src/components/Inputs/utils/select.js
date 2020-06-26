import { useContext, useMemo } from 'react';
import { get } from 'lodash';
import EditViewDataManagerContext from '../../../contexts/EditViewDataManager';

function useSelect(keys) {
  const {
    modifiedData,
    formErrors,
    onChange,
    isCreatingEntry,
    createActionAllowedFields,
  } = useContext(EditViewDataManagerContext);
  const value = get(modifiedData, keys, null);
  const allowedFields = useMemo(() => {
    return isCreatingEntry ? createActionAllowedFields : [];
  }, [isCreatingEntry, createActionAllowedFields]);

  return {
    allowedFields,
    formErrors,
    onChange,
    value,
  };
}

export default useSelect;
