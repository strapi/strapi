import * as React from 'react';

import { createContext } from '@radix-ui/react-context';
import { useIntl } from 'react-intl';

import { UpdateProjectSettings } from '../../../shared/contracts/admin';
import { Page } from '../components/PageHelpers';
import { useTypedSelector } from '../core/store/hooks';
import { useAPIErrorHandler } from '../hooks/useAPIErrorHandler';
import { useRBAC } from '../hooks/useRBAC';
import {
  ConfigurationLogo,
  useInitQuery,
  useProjectSettingsQuery,
  useUpdateProjectSettingsMutation,
} from '../services/admin';

import { useAuth } from './Auth';
import { useNotification } from './Notifications';
import { useTracking } from './Tracking';

import type { StrapiApp } from '../StrapiApp';

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

const [ConfigurationContextProvider, useConfiguration] =
  createContext<ConfigurationContextValue>('ConfigurationContext');

/* -------------------------------------------------------------------------------------------------
 * ConfigurationProvider
 * -----------------------------------------------------------------------------------------------*/

interface ConfigurationProviderProps {
  children: React.ReactNode;
  defaultAuthLogo: StrapiApp['configurations']['authLogo'];
  defaultMenuLogo: StrapiApp['configurations']['menuLogo'];
  showReleaseNotification?: boolean;
  showTutorials?: boolean;
}

const ConfigurationProvider = ({
  children,
  defaultAuthLogo,
  defaultMenuLogo,
  showReleaseNotification = false,
  showTutorials = false,
}: ConfigurationProviderProps) => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['project-settings']
  );
  const token = useAuth('ConfigurationProvider', (state) => state.token);

  const {
    allowedActions: { canRead },
  } = useRBAC(permissions);

  const {
    data: { authLogo: customAuthLogo, menuLogo: customMenuLogo } = {},
    error,
    isLoading,
  } = useInitQuery();

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'app.containers.App.notification.error.init' }),
      });
    }
  }, [error, formatMessage, toggleNotification]);

  const { data, isSuccess } = useProjectSettingsQuery(undefined, {
    skip: !token || !canRead,
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
          type: 'danger',
          message: formatAPIError(res.error),
        });
      }
    },
    [formatAPIError, formatMessage, toggleNotification, trackUsage, updateProjectSettingsMutation]
  );

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <ConfigurationContextProvider
      showReleaseNotification={showReleaseNotification}
      showTutorials={showTutorials}
      logos={{
        menu: {
          custom: isSuccess
            ? data?.menuLogo
            : {
                url: customMenuLogo ?? '',
              },
          default: defaultMenuLogo,
        },
        auth: {
          custom: isSuccess
            ? data?.authLogo
            : {
                url: customAuthLogo ?? '',
              },
          default: defaultAuthLogo,
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
