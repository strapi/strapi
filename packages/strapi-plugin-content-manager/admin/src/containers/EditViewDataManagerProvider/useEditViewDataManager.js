import { useContext } from 'react';
import EditViewDataManagerContext from './context';

const useEditViewDataManager = () => useContext(EditViewDataManagerContext);

export default useEditViewDataManager;
