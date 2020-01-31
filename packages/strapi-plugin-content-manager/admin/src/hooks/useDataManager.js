import { useContext } from 'react';
import EditViewDataManagerContext from '../contexts/EditViewDataManager';

const useDataManager = () => useContext(EditViewDataManagerContext);

export default useDataManager;
