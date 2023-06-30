import { useMemo } from 'react';

import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import get from 'lodash/get';

function useSelect(keys) {
  const {
    createActionAllowedFields,
    formErrors,
    isCreatingEntry,
    modifiedData,
    onChange,
    readActionAllowedFields,
    shouldNotRunValidations,
    updateActionAllowedFields,
  } = useCMEditViewDataManager();

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
    shouldNotRunValidations,
    value,
  };
}

export default useSelect;
