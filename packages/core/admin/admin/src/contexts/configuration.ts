import { createContext } from '@radix-ui/react-context';

export interface ConfigurationContextValue {
  logos: {
    auth: { custom?: string | null; default: string };
    menu: { custom?: string | null; default: string };
  };
  showTutorials: boolean;
  showReleaseNotification: boolean;
  updateProjectSettings: (settings: { authLogo?: string; menuLogo?: string }) => void;
}

const [ConfigurationContextProvider, useConfigurationContext] =
  createContext<ConfigurationContextValue>('ConfigurationContext');

const useConfiguration = () => useConfigurationContext('useConfiguration');

export { ConfigurationContextProvider, useConfiguration };
