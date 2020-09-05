import { useContext } from 'react';
import PermissionsContext from '../../contexts/Permissions';

const usePermissionsContext = () => {
  const permissionsContext = useContext(PermissionsContext);

  return permissionsContext;
};

export default usePermissionsContext;
