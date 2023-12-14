import * as React from 'react';

import { createContext } from '@radix-ui/react-context';
import {
  prefixFileUrlWithBackendUrl,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
  useTracking,
} from '@strapi/helper-plugin';
import { AxiosError } from 'axios';
import { useIntl } from 'react-intl';
import { UseMutateFunction, useMutation, useQuery } from 'react-query';

import { GetProjectSettings, UpdateProjectSettings } from '../../../shared/contracts/admin';

/* -------------------------------------------------------------------------------------------------
 * Configuration Context
 * -----------------------------------------------------------------------------------------------*/

interface UpdateProjectSettingsBody {
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

interface ConfigurationContextValue {
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

/**
 * TODO: it would be nice if this context actually lived in redux.
 * But we'd probably need to reconcile the fact we get the data three
 * different ways and what that actually looks like.
 */

const [ConfigurationContextProvider, useConfiguration] =
  createContext<ConfigurationContextValue>('ConfigurationContext');

/* -------------------------------------------------------------------------------------------------
 * ConfigurationProvider
 * -----------------------------------------------------------------------------------------------*/

interface ConfigurationProviderProps extends Required<Logos> {
  children: React.ReactNode;
  showReleaseNotification?: boolean;
  showTutorials?: boolean;
}

interface Logos {
  menuLogo: ConfigurationContextValue['logos']['menu'];
  authLogo: ConfigurationContextValue['logos']['auth'];
}

const ConfigurationProvider = ({
  children,
  authLogo: defaultAuthLogo,
  menuLogo: defaultMenuLogo,
  showReleaseNotification = false,
  showTutorials = false,
}: ConfigurationProviderProps) => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const { get, post } = useFetchClient();
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler();

  const { data, refetch, isSuccess } = useQuery<
    GetProjectSettings.Response,
    GetProjectSettings.Response,
    {
      [K in keyof Logos]?: ConfigurationProviderProps['authLogo']['custom'];
    }
  >(
    ['project-settings'],
    async () => {
      const { data, status } = await get<GetProjectSettings.Response>('/admin/project-settings', {
        /**
         * needed because the interceptors of the fetchClient redirect to
         * /login when receive a 401 and it would end up in an infinite
         * loop when the user doesn't have a session.
         */
        validateStatus: (status) => status < 500,
      });

      /**
       * However, we do need to know that the query failed. Because then
       * we want to fallback to our defaults.
       */
      if (status === 401) {
        throw new Error('Unauthenticated');
      }

      return data;
    },
    {
      retry: false,
      select(data) {
        return {
          authLogo: data.authLogo
            ? {
                name: data.authLogo.name,
                url: prefixFileUrlWithBackendUrl(data.authLogo.url),
              }
            : undefined,
          menuLogo: data.menuLogo
            ? {
                name: data.menuLogo.name,
                url: prefixFileUrlWithBackendUrl(data.menuLogo.url),
              }
            : undefined,
        };
      },
    }
  );

  const { mutate } = useMutation(
    async (body: UpdateProjectSettingsBody) => {
      const formData = new FormData();

      /**
       * We either only send files or we send null values.
       * Null removes the logo. If you don't want to effect
       * an existing logo, don't send anything.
       */
      Object.entries(body).forEach(([key, value]) => {
        if (value?.rawFile) {
          formData.append(key, value.rawFile);
        } else if (value === null) {
          formData.append(key, JSON.stringify(value));
        }
      });

      const { data } = await post<UpdateProjectSettings.Response>(
        '/admin/project-settings',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      /**
       * cooerce the response to a boolean so we can decide
       * if we need to send events in the `onSuccess` handler
       */
      return {
        menuLogo: !!data.menuLogo && !!body.menuLogo?.rawFile,
        authLogo: !!data.authLogo && !!body.menuLogo?.rawFile,
      };
    },
    {
      onError(error: AxiosError<Required<UpdateProjectSettings.Response>>) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },
      async onSuccess(data) {
        const { menuLogo, authLogo } = data;

        if (menuLogo) {
          trackUsage('didChangeLogo', {
            logo: 'menu',
          });
        }

        if (authLogo) {
          trackUsage('didChangeLogo', {
            logo: 'auth',
          });
        }

        toggleNotification({
          type: 'success',
          message: formatMessage({ id: 'app', defaultMessage: 'Saved' }),
        });

        refetch();
      },
    }
  );

  const updateProjectSettings = React.useCallback(mutate, [mutate]);

  return (
    <ConfigurationContextProvider
      showReleaseNotification={showReleaseNotification}
      showTutorials={showTutorials}
      logos={{
        menu: {
          custom: isSuccess ? data?.menuLogo : defaultMenuLogo.custom,
          default: defaultMenuLogo.default,
        },
        auth: {
          custom: isSuccess ? data?.authLogo : defaultAuthLogo.custom,
          default: defaultAuthLogo.default,
        },
      }}
      updateProjectSettings={updateProjectSettings}
    >
      {children}
    </ConfigurationContextProvider>
  );
};

export {
  ConfigurationContextProvider as _internalConfigurationContextProvider,
  ConfigurationProvider,
  useConfiguration,
};
export type {
  ConfigurationProviderProps,
  ConfigurationContextValue,
  ConfigurationLogo,
  UpdateProjectSettingsBody,
};
