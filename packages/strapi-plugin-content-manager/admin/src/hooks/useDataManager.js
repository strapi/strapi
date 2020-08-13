import { useContext } from 'react';
import EditViewDataManagerContext from '../contexts/EditViewDataManager';

const useDataManager = () => {
  return useContext(EditViewDataManagerContext);
};

export default useDataManager;
