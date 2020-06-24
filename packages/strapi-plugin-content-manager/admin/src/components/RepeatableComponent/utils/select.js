import { useContext } from 'react';
import EditViewDataManagerContext from '../../../contexts/EditViewDataManager';

function useSelect() {
  const { addRepeatableComponentToField, formErrors } = useContext(EditViewDataManagerContext);

  return {
    addRepeatableComponentToField,
    formErrors,
  };
}

export default useSelect;
