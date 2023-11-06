import { createContext } from '@radix-ui/react-context';
import { AxiosError } from 'axios';
import { UseMutateFunction } from 'react-query';

import { UpdateProjectSettings } from '../../../shared/contracts/admin';

export interface UpdateProjectSettingsBody {
  authLogo:
    | ((UpdateProjectSettings.Request['body']['authLogo'] | ConfigurationLogo['custom']) & {
        rawFile?: File;
      })
    | null;
  menuLogo:
    | ((UpdateProjectSettings.Request['body']['menuLogo'] | ConfigurationLogo['custom']) & {
        rawFile?: File;
      })
    | null;
}

interface ConfigurationLogo {
  custom?: {
    name?: string;
    url?: string;
  };
  default: string;
}

export interface ConfigurationContextValue {
  logos: {
    auth: ConfigurationLogo;
    menu: ConfigurationLogo;
  };
  showTutorials: boolean;
  showReleaseNotification: boolean;
  updateProjectSettings: UseMutateFunction<
    { menuLogo: boolean; authLogo: boolean },
    AxiosError<Required<UpdateProjectSettings.Response>>,
    UpdateProjectSettingsBody
  >;
}

const [ConfigurationContextProvider, useConfigurationContext] =
  createContext<ConfigurationContextValue>('ConfigurationContext');

const useConfiguration = () => useConfigurationContext('useConfiguration');

export { ConfigurationContextProvider, useConfiguration };
