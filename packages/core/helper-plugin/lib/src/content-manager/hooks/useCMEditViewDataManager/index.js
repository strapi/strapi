import { useContext } from 'react';
import ContentManagerEditViewDataManagerContext from '../../contexts/ContentManagerEditViewDataManagerContext';

const useCMEditViewDataManager = () => {
  return useContext(ContentManagerEditViewDataManagerContext);
};

export default useCMEditViewDataManager;
