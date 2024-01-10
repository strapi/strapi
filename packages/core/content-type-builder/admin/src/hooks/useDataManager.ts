import { useContext } from 'react';

import { DataManagerContext } from '../contexts/DataManagerContext';

export const useDataManager = () => useContext(DataManagerContext);
