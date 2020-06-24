import { useContext, useMemo } from 'react';
import { get } from 'lodash';
import EditViewDataManagerContext from '../../../contexts/EditViewDataManager';

function useSelect(name) {
  const {
    addComponentToDynamicZone,
    formErrors,
    layout,
    modifiedData,
    moveComponentUp,
    moveComponentDown,
    removeComponentFromDynamicZone,
  } = useContext(EditViewDataManagerContext);

  const dynamicDisplayedComponents = useMemo(
    () => get(modifiedData, [name], []).map(data => data.__component),
    [modifiedData, name]
  );

  return {
    addComponentToDynamicZone,
    formErrors,
    layout,

    moveComponentUp,
    moveComponentDown,
    removeComponentFromDynamicZone,
    dynamicDisplayedComponents,
  };
}

export default useSelect;
