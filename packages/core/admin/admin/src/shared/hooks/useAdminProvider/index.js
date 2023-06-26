import { useContext } from 'react';

import { AdminContext } from '../../../contexts';

const useAdminProvider = () => {
  const context = useContext(AdminContext);

  return context;
};

export default useAdminProvider;
