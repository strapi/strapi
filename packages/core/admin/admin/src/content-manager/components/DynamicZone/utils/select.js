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
    moveComponentUp,
    moveComponentDown,
    removeComponentFromDynamicZone,
    readActionAllowedFields,
    updateActionAllowedFields,
  } = useCMEditViewDataManager();

  const dynamicDisplayedComponents = useMemo(() => {
    const parsedName = Array.isArray(name) ? [name] : name;

    return get(modifiedData, parsedName, []).map(data => {
      return data.__component;
    });
  }, [modifiedData, name]);
  const contains = (items, name) => {
    if (Array.isArray(name)) {
      return items.includes(name[0]);
    }

    return items.includes(name);
  };
  const isFieldAllowed = useMemo(() => {
    const allowedFields = isCreatingEntry ? createActionAllowedFields : updateActionAllowedFields;

    return contains(allowedFields, name.split('.'));
  }, [name, isCreatingEntry, createActionAllowedFields, updateActionAllowedFields]);

  const isFieldReadable = useMemo(() => {
    const allowedFields = isCreatingEntry ? [] : readActionAllowedFields;

    return contains(allowedFields, name.split('.'));
  }, [name, isCreatingEntry, readActionAllowedFields]);

  return {
    addComponentToDynamicZone,
    formErrors,
    isCreatingEntry,
    isFieldAllowed,
    isFieldReadable,
    moveComponentUp,
    moveComponentDown,
    removeComponentFromDynamicZone,
    dynamicDisplayedComponents,
  };
}

export default useSelect;
