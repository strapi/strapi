import { useContext } from 'react';
import { get } from 'lodash';
import EditViewDataManagerContext from '../../../contexts/EditViewDataManager';

function useSelect(keys) {
  const { modifiedData, formErrors, onChange } = useContext(EditViewDataManagerContext);
  const value = get(modifiedData, keys, null);

  return {
    formErrors,
    onChange,
    value,
  };
}

export default useSelect;
