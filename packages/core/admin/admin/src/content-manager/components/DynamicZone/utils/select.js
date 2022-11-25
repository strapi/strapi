import { useMemo } from 'react';
import { get } from 'lodash';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

function useSelect(name) {
  const {
    addComponentToDynamicZone,
    createActionAllowedFields,
    isCreatingEntry,
    formErrors,
    modifiedData,
    moveComponentField,
    removeComponentFromDynamicZone,
    readActionAllowedFields,
    updateActionAllowedFields,
  } = useCMEditViewDataManager();

  console.log(modifiedData);

  const dynamicDisplayedComponents = useMemo(
    () =>
      get(modifiedData, [name], []).map((data) => ({
        componentUid: data.__component,
        id: data.id,
      })),
    [modifiedData, name]
  );

  const isFieldAllowed = useMemo(() => {
    const allowedFields = isCreatingEntry ? createActionAllowedFields : updateActionAllowedFields;

    return allowedFields.includes(name);
  }, [name, isCreatingEntry, createActionAllowedFields, updateActionAllowedFields]);

  const isFieldReadable = useMemo(() => {
    const allowedFields = isCreatingEntry ? [] : readActionAllowedFields;

    return allowedFields.includes(name);
  }, [name, isCreatingEntry, readActionAllowedFields]);

  return {
    addComponentToDynamicZone,
    formErrors,
    isCreatingEntry,
    isFieldAllowed,
    isFieldReadable,
    moveComponentField,
    removeComponentFromDynamicZone,
    dynamicDisplayedComponents,
  };
}

export default useSelect;
