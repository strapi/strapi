import { useContext } from 'react';
import DataManagerContext from '../contexts/DataManagerContext';

const useDataManager = () => useContext(DataManagerContext);

export default useDataManager;
