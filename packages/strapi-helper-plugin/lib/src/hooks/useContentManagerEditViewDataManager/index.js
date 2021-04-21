import { useContext } from 'react';
import ContentManagerEditViewDataManagerContext from '../../contexts/ContentManagerEditViewDataManagerContext';

const useContentManagerEditViewDataManager = () => {
  return useContext(ContentManagerEditViewDataManagerContext);
};

export default useContentManagerEditViewDataManager;
