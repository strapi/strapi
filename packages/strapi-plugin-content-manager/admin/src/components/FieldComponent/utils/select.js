import { useContext } from 'react';
import { get } from 'lodash';
import EditViewDataManagerContext from '../../../contexts/EditViewDataManager';

function useSelect(name) {
  const { modifiedData, removeComponentFromField } = useContext(EditViewDataManagerContext);
  const componentValue = get(modifiedData, name, null);

  return {
    removeComponentFromField,
    componentValue,
  };
}

export default useSelect;
