import { useContext } from 'react';

import { DataManagerContext } from './DataManagerContext';

export const useDataManager = () => useContext(DataManagerContext);
