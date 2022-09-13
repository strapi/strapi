import { useContext } from 'react';
import { PermissionsDataManagerContext } from '../../contexts';

const usePermissionsDataManager = () => useContext(PermissionsDataManagerContext);

export default usePermissionsDataManager;
