import { useContext } from 'react';

import { ConfigurationContext } from '../contexts/configuration';

export const useConfiguration = () => useContext(ConfigurationContext);
