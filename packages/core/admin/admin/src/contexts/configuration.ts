import { createContext } from '@radix-ui/react-context';
import { AxiosError } from 'axios';
import { UseMutateFunction } from 'react-query';

import { GetProjectSettings, UpdateProjectSettings } from '../../../shared/contracts/admin';

export interface UpdateProjectSettingsBody {
  authLogo: (UpdateProjectSettings.Request['body']['authLogo'] & { rawFile?: File }) | null;
  menuLogo: (UpdateProjectSettings.Request['body']['menuLogo'] & { rawFile?: File }) | null;
}

export interface ConfigurationContextValue {
  logos: {
    auth: {
      custom?: GetProjectSettings.Response['authLogo'];
      default: string;
    };
    menu: {
      custom?: GetProjectSettings.Response['menuLogo'];
      default: string;
    };
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
