import { useContext } from 'react';
import EditViewDataManagerContext from '../../../contexts/EditViewDataManager';

function select() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { addRepeatableComponentToField, formErrors } = useContext(EditViewDataManagerContext);

  return {
    addRepeatableComponentToField,
    formErrors,
  };
}

export default select;
