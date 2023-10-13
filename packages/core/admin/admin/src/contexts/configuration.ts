import { createContext } from 'react';

export interface ConfigurationContextValue {
  logos: {
    auth: { custom?: string | null; default: string };
    menu: { custom?: string | null; default: string };
  };
  showTutorials: boolean;
  showReleaseNotification: boolean;
  updateProjectSettings: (settings: { authLogo?: string; menuLogo?: string }) => void;
}

const ConfigurationContext = createContext<ConfigurationContextValue>({
  logos: {
    auth: { default: '' },
    menu: { default: '' },
  },
  showTutorials: false,
  showReleaseNotification: false,
  updateProjectSettings: () => {
    throw new Error('updateProjectSettings was not implemented');
  },
});

export { ConfigurationContext };
