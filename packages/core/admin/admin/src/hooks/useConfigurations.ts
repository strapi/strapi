import { useContext } from 'react';

import { ConfigurationsContext } from '../contexts/configuration';

export const useConfigurations = () => useContext(ConfigurationsContext);
