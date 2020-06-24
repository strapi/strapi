import { useContext } from 'react';
import { get } from 'lodash';
import EditViewDataManagerContext from '../../../contexts/EditViewDataManager';

function select(name) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { modifiedData, removeComponentFromField } = useContext(EditViewDataManagerContext);
  const componentValue = get(modifiedData, name, null);

  return {
    removeComponentFromField,
    componentValue,
  };
}

export default select;
