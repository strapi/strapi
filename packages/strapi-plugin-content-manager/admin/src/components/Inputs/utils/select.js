import { useMemo } from 'react';
import { get } from 'lodash';
import useDataManager from '../../../hooks/useDataManager';
import useEditView from '../../../hooks/useEditView';

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
  } = useDataManager();
  const { layout: currentContentTypeLayout } = useEditView();

  const allowedFields = useMemo(() => {
    return isCreatingEntry ? createActionAllowedFields : updateActionAllowedFields;
  }, [isCreatingEntry, createActionAllowedFields, updateActionAllowedFields]);

  const readableFields = useMemo(() => {
    return isCreatingEntry ? [] : readActionAllowedFields;
  }, [isCreatingEntry, readActionAllowedFields]);

  const value = get(modifiedData, keys, null);

  const valueAllFields = modifiedData;

  return {
    allowedFields,
    currentContentTypeLayout,
    formErrors,
    isCreatingEntry,
    onChange,
    readableFields,
    shouldNotRunValidations,
    value,
    valueAllFields,
  };
}

export default useSelect;
