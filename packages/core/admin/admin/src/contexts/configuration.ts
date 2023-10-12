import { createContext } from 'react';

interface ConfigurationsContextValue {
  showReleaseNotification: boolean;
  logos: {
    auth: { custom?: string; default: string };
  };
}

const ConfigurationsContext = createContext<ConfigurationsContextValue>({
  showReleaseNotification: false,
  logos: {
    auth: { default: '' },
  },
});

export { ConfigurationsContext };
