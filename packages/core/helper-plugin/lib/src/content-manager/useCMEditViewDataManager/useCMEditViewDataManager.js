import { useContext } from 'react';
import { CMEditViewDataManagerContext } from '../CMEditViewDataManagerContext';

const useCMEditViewDataManager = () => {
  return useContext(CMEditViewDataManagerContext);
};

export { useCMEditViewDataManager };
