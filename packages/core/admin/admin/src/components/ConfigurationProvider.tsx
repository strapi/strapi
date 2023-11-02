import * as React from 'react';

import {
  prefixFileUrlWithBackendUrl,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
  useTracking,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useMutation, useQuery } from 'react-query';

import { GetProjectSettings, UpdateProjectSettings } from '../../../shared/contracts/admin';
import { ConfigurationContextProvider, UpdateProjectSettingsBody } from '../contexts/configuration';

import type { AxiosError } from 'axios';

interface ConfigurationProviderProps {
  children: React.ReactNode;
  authLogo: string;
  menuLogo: string;
  showReleaseNotification?: boolean;
  showTutorials?: boolean;
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

  const { data, refetch } = useQuery(
    ['project-settings'],
    async () => {
      const { data } = await get<GetProjectSettings.Response>('/admin/project-settings');

      return data;
    },
    {
      select(data) {
        return {
          authLogo: data.authLogo
            ? {
                ...data.authLogo,
                url: prefixFileUrlWithBackendUrl(data.authLogo.url)!,
              }
            : undefined,
          menuLogo: data.menuLogo
            ? {
                ...data.authLogo,
                url: prefixFileUrlWithBackendUrl(data.menuLogo.url)!,
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
        menu: { custom: data?.menuLogo, default: defaultMenuLogo },
        auth: { custom: data?.authLogo, default: defaultAuthLogo },
      }}
      updateProjectSettings={updateProjectSettings}
    >
      {children}
    </ConfigurationContextProvider>
  );
};

export { ConfigurationProvider };
export type { ConfigurationProviderProps };
