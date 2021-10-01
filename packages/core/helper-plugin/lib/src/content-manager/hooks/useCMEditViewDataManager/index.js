import { useContext } from 'react';
import CMEditViewDataManagerContext from '../../contexts/CMEditViewDataManagerContext';

const useCMEditViewDataManager = () => {
  return useContext(CMEditViewDataManagerContext);
};

export default useCMEditViewDataManager;
