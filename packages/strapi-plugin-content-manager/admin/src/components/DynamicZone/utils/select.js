import { useMemo } from 'react';
import { get } from 'lodash';
import useDataManager from '../../../hooks/useDataManager';

function useSelect(name) {
  const {
    addComponentToDynamicZone,
    createActionAllowedFields,
    isCreatingEntry,
    formErrors,
    layout,
    modifiedData,
    moveComponentUp,
    moveComponentDown,
    removeComponentFromDynamicZone,
  } = useDataManager();

  const dynamicDisplayedComponents = useMemo(
    () => get(modifiedData, [name], []).map(data => data.__component),
    [modifiedData, name]
  );

  const isFieldAllowed = useMemo(() => {
    const allowedFields = isCreatingEntry ? createActionAllowedFields : [];

    return allowedFields.includes(name);
  }, [name, isCreatingEntry, createActionAllowedFields]);

  return {
    addComponentToDynamicZone,
    formErrors,
    layout,
    isFieldAllowed,
    moveComponentUp,
    moveComponentDown,
    removeComponentFromDynamicZone,
    dynamicDisplayedComponents,
  };
}

export default useSelect;
