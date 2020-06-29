import { useContext, useMemo } from 'react';
import { get } from 'lodash';
import EditViewDataManagerContext from '../../../contexts/EditViewDataManager';

function useSelect(keys) {
  const {
    createActionAllowedFields,
    formErrors,
    isCreatingEntry,
    modifiedData,
    onChange,
  } = useContext(EditViewDataManagerContext);

  const allowedFields = useMemo(() => {
    return isCreatingEntry ? createActionAllowedFields : [];
  }, [isCreatingEntry, createActionAllowedFields]);

  const value = get(modifiedData, keys, null);

  return {
    allowedFields,
    formErrors,
    onChange,
    value,
  };
}

export default useSelect;
