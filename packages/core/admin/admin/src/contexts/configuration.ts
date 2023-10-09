import { createContext } from 'react';

interface ConfigurationsContextValue {
  logos: {
    auth: { custom?: string; default: string };
  };
}

const ConfigurationsContext = createContext<ConfigurationsContextValue>({
  logos: {
    auth: { default: '' },
  },
});

export { ConfigurationsContext };
