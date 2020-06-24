import { useContext } from 'react';
import { get } from 'lodash';
import EditViewDataManagerContext from '../../../contexts/EditViewDataManager';

function select(keys) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { modifiedData, formErrors, onChange } = useContext(EditViewDataManagerContext);
  const value = get(modifiedData, keys, null);

  return {
    formErrors,
    onChange,
    value,
  };
}

export default select;
