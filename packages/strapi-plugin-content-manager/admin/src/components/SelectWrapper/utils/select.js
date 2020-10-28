import { useMemo } from 'react';
import { get } from 'lodash';
import useDataManager from '../../../hooks/useDataManager';
import useEditView from '../../../hooks/useEditView';

function useSelect({ isUserAllowedToEditField, isUserAllowedToReadField, name, targetModel }) {
  const {
    isCreatingEntry,
    createActionAllowedFields,
    readActionAllowedFields,
    updateActionAllowedFields,
  } = useDataManager();

  // TODO important! remove models dependency from the useEditView hook,
  // This info should be handle in the layout?
  const { models } = useEditView();

  const displayNavigationLink = useMemo(() => {
    const targetModelSchema = models.find(obj => obj.uid === targetModel);

    return get(targetModelSchema, 'isDisplayed', false);
  }, [targetModel, models]);

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

  const isFieldReadable = useMemo(() => {
    if (isUserAllowedToReadField) {
      return true;
    }

    const allowedFields = isCreatingEntry ? [] : readActionAllowedFields;

    return allowedFields.includes(name);
  }, [isCreatingEntry, isUserAllowedToReadField, name, readActionAllowedFields]);

  return {
    displayNavigationLink,
    isCreatingEntry,
    isFieldAllowed,
    isFieldReadable,
  };
}

export default useSelect;
