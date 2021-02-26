import { useMemo } from 'react';
import { get } from 'lodash';
import useDataManager from '../../../hooks/useDataManager';

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
  } = useDataManager();

  const dynamicDisplayedComponents = useMemo(
    () => get(modifiedData, name, []).map(data => data.__component),
    [modifiedData, name]
  );

  /**
   * Will strip the numeric ID part of a Name path to help with the name matching
   *
   * E.g. if we have a repeatable component Comp1 with a DynamicZone ZoneA
   * The Name for each DZ in multiple instances of the Comp1 will be Comp1.0.ZoneA, Comp1.1.ZoneA
   * But the permissions object has the name as Comp1.ZoneA because it does not deal with actual instances
   * of the component but the model.
   * As result, lookup for permissions by name will not work as is. So we strip the dynamic part of the name.
   * @param {string[]} items is an array of input names
   * @param {string} name is a name of the input we are looking for
   */
  const contains = (items, name) => {
    const parts = name.split('.');
    const canonicalName = parts
      .filter(part => {
        return Number.isNaN(part) || Number.isNaN(parseFloat(part));
      })
      .join('.');
    console.log(canonicalName);
    
return items.includes(canonicalName);
  };

  const isFieldAllowed = useMemo(() => {
    const allowedFields = isCreatingEntry ? createActionAllowedFields : updateActionAllowedFields;

    // return allowedFields.includes(name);
    // Repeatable components have names like CompName.NumericId.DZName
    // Simple string match will not work. Hence we use more clever utility function here
    return contains(allowedFields, name);
  }, [name, isCreatingEntry, createActionAllowedFields, updateActionAllowedFields]);

  const isFieldReadable = useMemo(() => {
    const allowedFields = isCreatingEntry ? [] : readActionAllowedFields;

    // return allowedFields.includes(name);
    // Repeatable components have names like CompName.NumericId.DZName
    // Simple string match will not work. Hence we use more clever utility function here
    return contains(allowedFields, name);
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
