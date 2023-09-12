import { useContext } from 'react';

import { ConfigurationsContext } from '../../contexts';

const useConfigurations = () => {
  const context = useContext(ConfigurationsContext);

  return context;
};

export default useConfigurations;
