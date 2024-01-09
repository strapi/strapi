import * as React from 'react';

import { createContext } from '@radix-ui/react-context';
import { useAPIErrorHandler, useNotification, useTracking } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { UpdateProjectSettings } from '../../../shared/contracts/admin';
import {
  ConfigurationLogo,
  useProjectSettingsQuery,
  useUpdateProjectSettingsMutation,
} from '../services/admin';

import { useAuth } from './Auth';

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

interface ConfigurationContextValue {
  logos: {
    auth: ConfigurationLogo;
    menu: ConfigurationLogo;
  };
  showTutorials: boolean;
  showReleaseNotification: boolean;
  updateProjectSettings: (body: UpdateProjectSettingsBody) => Promise<void>;
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
  const toggleNotification = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const token = useAuth('ConfigurationProvider', (state) => state.token);

  const { data, isSuccess } = useProjectSettingsQuery(undefined, {
    skip: !token,
  });

  const [updateProjectSettingsMutation] = useUpdateProjectSettingsMutation();

  const updateProjectSettings = React.useCallback(
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

      const res = await updateProjectSettingsMutation(formData);

      if ('data' in res) {
        const updatedMenuLogo = !!res.data.menuLogo && !!body.menuLogo?.rawFile;
        const updatedAuthLogo = !!res.data.authLogo && !!body.authLogo?.rawFile;

        if (updatedMenuLogo) {
          trackUsage('didChangeLogo', {
            logo: 'menu',
          });
        }

        if (updatedAuthLogo) {
          trackUsage('didChangeLogo', {
            logo: 'auth',
          });
        }

        toggleNotification({
          type: 'success',
          message: formatMessage({ id: 'app', defaultMessage: 'Saved' }),
        });
      } else {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(res.error),
        });
      }
    },
    [formatAPIError, formatMessage, toggleNotification, trackUsage, updateProjectSettingsMutation]
  );

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
